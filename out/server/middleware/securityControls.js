import crypto from "crypto";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { clientIp, inCidr, parseIps } from "../services/security/ip";
const memBuckets = Object.create(null);
function now() { return Date.now(); }
function getId(req) {
    const apiKey = req.headers["x-api-key"] || "";
    if (apiKey)
        return "key:" + apiKey.slice(0, 16);
    return "ip:" + clientIp(req);
}
async function getIpVerdict(req) {
    const ip = clientIp(req);
    if (!ip)
        return { allow: true, reason: "no_ip" };
    // env lists (fast path)
    const allowEnv = parseIps(process.env.IP_ALLOWLIST || "");
    const denyEnv = parseIps(process.env.IP_DENYLIST || "");
    if (denyEnv.some(v => v.includes("/") ? inCidr(ip, v) : ip === v))
        return { allow: false, reason: "deny_env" };
    if (allowEnv.length && !allowEnv.some(v => v.includes("/") ? inCidr(ip, v) : ip === v))
        return { allow: false, reason: "not_in_allow_env" };
    // db rules
    try {
        const r = await db.execute(sql `SELECT action, value FROM ip_rules ORDER BY createdAt DESC`);
        for (const row of (r.rows || [])) {
            const val = String(row.value);
            const hit = val.includes("/") ? inCidr(ip, val) : (val === ip);
            if (hit)
                return { allow: row.action === "allow", reason: row.action + "_db" };
        }
    }
    catch { }
    return { allow: true, reason: "default" };
}
export async function ipGate(req, res, next) {
    const verdict = await getIpVerdict(req);
    if (!verdict.allow)
        return res.status(403).json({ error: "ip_blocked", reason: verdict.reason });
    next();
}
export function hashKey(secret) {
    const salt = "v1$" + (process.env.API_KEY_PREFIX || "sk_");
    return crypto.createHash("sha256").update(salt + secret).digest("hex");
}
export async function apiKeyAuth(req, res, next) {
    const key = String(req.headers["x-api-key"] || "");
    if (!key)
        return res.status(401).json({ error: "missing_api_key" });
    const prefix = key.slice(0, 10);
    const hash = hashKey(key);
    const r = await db.execute(sql `SELECT id, name, scopes, revoked_at FROM api_keys WHERE prefix=${prefix} AND hash=${hash} LIMIT 1`);
    const row = r.rows?.[0];
    if (!row || row.revoked_at)
        return res.status(401).json({ error: "invalid_api_key" });
    req.apiKey = { id: row.id, name: row.name, scopes: row.scopes || [] };
    await db.execute(sql `UPDATE api_keys SET last_used_at=now() WHERE id=${row.id}`);
    next();
}
export async function maintenanceGate(req, res, next) {
    // DB setting overrides env
    let on = String(process.env.MAINTENANCE_MODE || "false").toLowerCase() === "true";
    try {
        const s = await db.execute(sql `SELECT value FROM app_settings WHERE key='maintenance_mode' LIMIT 1`);
        if (s.rows?.[0]?.value != null)
            on = !!s.rows[0].value;
    }
    catch { }
    if (!on)
        return next();
    const scopes = req.apiKey?.scopes || [];
    const isBypass = scopes.includes("bypass_maintenance");
    const isAdmin = req.user?.role === "admin";
    const safePaths = ["/_live", "/_ready", "/_health", "/metrics", "/auth", "/api/alerts/test"];
    if (isBypass || isAdmin || safePaths.some(p => req.path.startsWith(p)))
        return next();
    return res.status(503).json({ error: "maintenance_mode" });
}
export function rateLimit() {
    const enabled = String(process.env.RATE_LIMIT_ENABLED || "true").toLowerCase() === "true";
    const W = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
    const MAX = Number(process.env.RATE_LIMIT_MAX || 120);
    const BURST = Number(process.env.RATE_LIMIT_BURST || 40);
    return (req, res, next) => {
        if (!enabled)
            return next();
        const id = getId(req);
        const nowMs = now();
        const b = (memBuckets[id] ||= { tokens: MAX + BURST, updated: nowMs });
        const elapsed = nowMs - b.updated;
        // refill tokens linearly to MAX over window
        const refill = (elapsed / W) * MAX;
        b.tokens = Math.min(MAX + BURST, b.tokens + refill);
        b.updated = nowMs;
        // weight by method (POST/PUT heavier)
        const cost = (req.method === "GET" ? 1 : 2);
        if (b.tokens >= cost) {
            b.tokens -= cost;
            res.setHeader("X-RateLimit-Limit", String(MAX));
            res.setHeader("X-RateLimit-Remaining", String(Math.max(0, Math.floor(b.tokens))));
            return next();
        }
        const retry = Math.ceil(((cost - b.tokens) / MAX) * W);
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil(retry / 1000))));
        return res.status(429).json({ error: "rate_limited" });
    };
}
