import { Router } from "express";
import os from "node:os";
import { Pool } from "pg";
// If you already have a shared pool, import and reuse it.
// Otherwise this creates a quick one off env; safe for read-only checks.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "") ? false : { rejectUnauthorized: false }
});
const r = Router();
async function tryFetch(url, init) {
    try {
        const res = await fetch(url, { method: "GET", ...init, redirect: "manual" });
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json") ? await res.json().catch(() => null) : await res.text().catch(() => null);
        return { ok: res.ok, status: res.status, headers: Object.fromEntries(res.headers.entries()), json: ct.includes("json") ? body : undefined, text: !ct.includes("json") ? String(body) : undefined };
    }
    catch (e) {
        return { ok: false, err: e?.message || String(e) };
    }
}
async function tableHas(cols, table) {
    try {
        const q = `
      SELECT column_name FROM information_schema.columns
      WHERE table_name = $1
    `;
        const { rows } = await pool.query(q, [table]);
        const have = new Set(rows.map(r => r.column_name));
        const missing = cols.filter(c => !have.has(c));
        return { ok: missing.length === 0, info: { missing, have: [...have] } };
    }
    catch (e) {
        return { ok: false, err: e.message };
    }
}
function summarize(features) {
    const counts = { installed: 0, partial: 0, error: 0 };
    for (const f of features)
        counts[f.status]++;
    const status = counts.error > 0 ? "error" : (counts.partial > 0 ? "partial" : "installed");
    return { status, counts };
}
r.get("/full-audit", async (req, res) => {
    const base = `${req.protocol}://${req.get("host")}`;
    // Auth checks
    const authDev = async () => {
        const r = await fetch(`${base}/api/auth/dev-login`, { method: "POST" }).then(r => r.json()).catch(() => null);
        return r && r.token ? { ok: true, info: { tokenLen: String(r.token).length } } : { ok: false, err: "dev-login missing or no token" };
    };
    // UI checks (SPA headers + 200)
    const ui = (path) => async () => {
        const r = await tryFetch(`${base}${path}`);
        const ok = !!(r.ok && r.headers && r.headers["x-index-hash"]);
        return ok ? { ok: true, info: { hash: r.headers["x-index-hash"], servedFrom: r.headers["x-served-from"] } }
            : { ok: false, err: `${path} failed (${r.status ?? "no status"})` };
    };
    // API checks
    const apiOK = (path, expectArrayKey) => async () => {
        const r = await tryFetch(`${base}${path}`);
        const ok = r.ok && (expectArrayKey ? Array.isArray(r.json?.[expectArrayKey]) : true);
        return ok ? { ok: true, info: { status: r.status, keys: Object.keys(r.json || {}) } }
            : { ok: false, err: `${path} ${r.status} ${r.err || ""}` };
    };
    // ENV presence
    const need = (keys, label) => async () => {
        const missing = keys.filter(k => !process.env[k] || String(process.env[k]).trim() === "");
        return { ok: missing.length === 0, info: { present: keys.filter(k => !missing.includes(k)), missing }, err: missing.length ? `${label} missing: ${missing.join(",")}` : undefined };
    };
    // ---------- Tabs & Features ----------
    const tabs = [
        {
            name: "Auth",
            features: [
                { key: "Twilio Verify-only path live", check: need(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"], "Twilio") },
                { key: "Dev login working (non-prod)", check: authDev, notes: "Used only in dev" }
            ]
        },
        {
            name: "Contacts (CRM)",
            features: [
                { key: "/contacts page renders SPA", check: ui("/contacts") },
                { key: "/api/contacts responds", check: apiOK("/api/contacts", "items") },
                { key: "contacts table schema", check: tableHas(["id", "email", "first_name", "last_name"], "contacts") }
            ]
        },
        {
            name: "Sales Pipeline",
            features: [
                { key: "/sales-pipeline page renders SPA", check: ui("/sales-pipeline") },
                { key: "/api/pipeline responds", check: apiOK("/api/pipeline", "items") },
                { key: "applications table schema", check: tableHas(["id", "stage", "createdAt"], "applications") }
            ]
        },
        {
            name: "Lenders",
            features: [
                { key: "/lenders page renders SPA", check: ui("/lenders") },
                { key: "/api/lenders list", check: apiOK("/api/lenders", "items") },
                { key: "lenders schema", check: tableHas(["id", "company_name", "min_loan_amount", "max_loan_amount", "is_active"], "lenders") }
            ]
        },
        {
            name: "Documents",
            features: [
                { key: "/documents page renders SPA", check: ui("/documents") },
                { key: "/api/documents list", check: apiOK("/api/documents", "items") },
                { key: "S3 env present", check: need(["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "S3_BUCKET"], "S3") }
            ]
        },
        {
            name: "Comms",
            features: [
                { key: "/comms page renders SPA", check: ui("/comms") },
                { key: "Twilio env present", check: need(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"], "Twilio") },
                { key: "/api/comms dialer token", check: apiOK("/api/comms/token") }
            ]
        },
        {
            name: "Analytics",
            features: [
                { key: "/analytics page renders SPA", check: ui("/analytics") },
                { key: "GA/GTM env present", check: need(["GA_MEASUREMENT_ID", "GA_API_SECRET", "GTM_CONTAINER_ID"], "GA/GTM") }
            ]
        },
        {
            name: "Marketing",
            features: [
                { key: "/marketing page renders SPA", check: ui("/marketing") },
                { key: "LinkedIn env", check: need(["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_AD_ACCOUNT_ID"], "LinkedIn") },
                { key: "/api/marketing/campaigns", check: apiOK("/api/marketing/campaigns", "items") }
            ]
        },
        {
            name: "Productivity",
            features: [
                { key: "/productivity page renders SPA", check: ui("/productivity") },
                { key: "O365 env", check: need(["O365_CLIENT_ID", "O365_TENANT_ID", "O365_CLIENT_SECRET"], "O365") }
            ]
        },
        {
            name: "Security",
            features: [
                { key: "/api/ops/schema-check", check: apiOK("/api/ops/schema-check") },
                { key: "Webhook secrets present", check: need(["TWILIO_WEBHOOK_SECRET"], "Webhook") },
                { key: "S3 AV flag present (if used)", check: need(["AV_SCAN_ENABLED"], "AV") }
            ]
        },
        {
            name: "Platform/Observability",
            features: [
                { key: "/api/ops/routes registry", check: apiOK("/api/ops/routes") },
                { key: "Redis URL (if queues)", check: need(["REDIS_URL"], "Redis") }
            ]
        }
    ];
    // Run all checks sequentially (fast enough; avoids DB hammering)
    const results = [];
    for (const tab of tabs) {
        const features = [];
        for (const feature of tab.features) {
            const out = await feature.check();
            const status = out.ok ? "installed" : "error";
            features.push({ key: feature.key, status, proof: out, notes: feature.notes || "" });
        }
        const sum = summarize(features);
        results.push({ tab: tab.name, status: sum.status, counts: sum.counts, features });
    }
    const totals = results.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {});
    res.json({
        ok: true,
        host: req.get("host"),
        node: process.version,
        server: os.hostname(),
        summary: { tabs: results.length, byStatus: totals },
        results
    });
});
export default r;
