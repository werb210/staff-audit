import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { apiKeyAuth, hashKey } from "../../middleware/securityControls";
import { customAlphabet } from "nanoid";
const router = Router();
// --- API keys (staff-auth endpoints; assume your existing authz protects /api/security/* ) ---
router.get("/keys", async (_req, res) => {
    const r = await db.execute(sql `SELECT id, name, prefix, scopes, revoked_at, last_used_at, createdAt FROM api_keys ORDER BY createdAt DESC`);
    res.json(r.rows || []);
});
router.post("/keys", async (req, res) => {
    const name = String(req.body?.name || "Integration");
    const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes : ["api"];
    const gen = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", 32);
    const secret = (process.env.API_KEY_PREFIX || "sk_") + gen();
    const prefix = secret.slice(0, 10);
    const hash = hashKey(secret);
    const ins = await db.execute(sql `INSERT INTO api_keys(name, prefix, hash, scopes) VALUES (${name}, ${prefix}, ${hash}, ${scopes}) RETURNING id`);
    res.json({ ok: true, id: ins.rows?.[0]?.id, key: secret }); // plaintext returned once
});
router.post("/keys/:id/revoke", async (req, res) => {
    await db.execute(sql `UPDATE api_keys SET revoked_at=now() WHERE id=${req.params.id}`);
    res.json({ ok: true });
});
// Example protected endpoint with API key
router.get("/ping", apiKeyAuth, async (req, res) => {
    res.json({ ok: true, who: req.apiKey?.name || "api-key", scopes: req.apiKey?.scopes || [] });
});
// --- IP rules ---
router.get("/ip-rules", async (_req, res) => {
    const r = await db.execute(sql `SELECT id, action, value, note, createdAt FROM ip_rules ORDER BY createdAt DESC`);
    res.json(r.rows || []);
});
router.post("/ip-rules", async (req, res) => {
    const { action, value, note } = req.body || {};
    if (!action || !value)
        return res.status(400).json({ error: "action and value required" });
    await db.execute(sql `INSERT INTO ip_rules(action, value, note) VALUES (${action}, ${value}, ${note || null})`);
    res.json({ ok: true });
});
router.delete("/ip-rules/:id", async (req, res) => {
    await db.execute(sql `DELETE FROM ip_rules WHERE id=${req.params.id}`);
    res.json({ ok: true });
});
// --- Maintenance ---
router.get("/maintenance", async (_req, res) => {
    const r = await db.execute(sql `SELECT value FROM app_settings WHERE key='maintenance_mode' LIMIT 1`);
    const on = r.rows?.[0]?.value ?? (String(process.env.MAINTENANCE_MODE || "false").toLowerCase() === "true");
    res.json({ on });
});
router.post("/maintenance", async (req, res) => {
    const on = !!req.body?.on;
    await db.execute(sql `
    INSERT INTO app_settings(key, value, updatedAt)
    VALUES ('maintenance_mode', ${on}, now())
    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updatedAt=now()
  `);
    res.json({ ok: true, on });
});
export default router;
