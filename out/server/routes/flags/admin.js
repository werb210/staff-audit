import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { ctxFromReq, isFlagEnabled, assignExperiment } from "../../services/flags/eval";
const router = Router();
/* ----- Flags CRUD ----- */
router.get("/flags", async (_req, res) => {
    const r = await db.execute(sql `SELECT key, description, enabled, rollout_pct, tags, createdAt, updatedAt FROM feature_flags ORDER BY key`);
    res.json(r.rows || []);
});
router.post("/flags", async (req, res) => {
    const { key, description = null, enabled = false, rollout_pct = 0, tags = [] } = req.body || {};
    const up = await db.execute(sql `
    INSERT INTO feature_flags(key, description, enabled, rollout_pct, tags)
    VALUES (${key}, ${description}, ${enabled}, ${rollout_pct}, ${tags})
    ON CONFLICT (key) DO UPDATE SET description=EXCLUDED.description, enabled=EXCLUDED.enabled, rollout_pct=EXCLUDED.rollout_pct, tags=EXCLUDED.tags, updatedAt=now()
    RETURNING key
  `);
    res.json({ ok: true, key: up.rows?.[0]?.key });
});
router.post("/flags/:key/override", async (req, res) => {
    const { scope, value, tenant_id = null, user_id = null, role = null } = req.body || {};
    if (!['global', 'role', 'user', 'tenant'].includes(scope))
        return res.status(400).json({ error: "bad scope" });
    await db.execute(sql `
    INSERT INTO flag_overrides(flag_key, scope, tenant_id, user_id, role, value)
    VALUES (${req.params.key}, ${scope}, ${tenant_id}, ${user_id}, ${role}, ${!!value})
  `);
    res.json({ ok: true });
});
router.get("/flags/:key/eval", async (req, res) => {
    const ctx = ctxFromReq(req);
    res.json(await isFlagEnabled(req.params.key, ctx));
});
/* ----- Experiments ----- */
router.get("/experiments", async (_req, res) => {
    const e = await db.execute(sql `SELECT key, description, status, allocation_pct, exposure_flag_key, createdAt, updatedAt FROM experiments ORDER BY createdAt DESC`);
    const v = await db.execute(sql `SELECT experiment_key, variant_key, weight FROM experiment_variants ORDER BY experiment_key, variant_key`);
    const byExp = {};
    for (const r of (v.rows || [])) {
        (byExp[r.experiment_key] ||= []).push({ variant_key: r.variant_key, weight: r.weight });
    }
    res.json((e.rows || []).map((x) => ({ ...x, variants: byExp[x.key] || [] })));
});
router.post("/experiments", async (req, res) => {
    const { key, description = null, allocation_pct = 100, exposure_flag_key = null, variants = [{ variant_key: 'control', weight: 50 }, { variant_key: 'B', weight: 50 }] } = req.body || {};
    await db.execute(sql `
    INSERT INTO experiments(key, description, allocation_pct, exposure_flag_key)
    VALUES (${key}, ${description}, ${allocation_pct}, ${exposure_flag_key})
    ON CONFLICT (key) DO UPDATE SET description=EXCLUDED.description, allocation_pct=EXCLUDED.allocation_pct, exposure_flag_key=EXCLUDED.exposure_flag_key, updatedAt=now()
  `);
    // upsert variants (simple: delete + reinsert)
    await db.execute(sql `DELETE FROM experiment_variants WHERE experiment_key=${key}`);
    for (const v of (variants || [])) {
        await db.execute(sql `INSERT INTO experiment_variants(experiment_key, variant_key, weight, config) VALUES (${key}, ${v.variant_key}, ${Number(v.weight || 0)}, ${v.config || {}})`);
    }
    res.json({ ok: true });
});
router.post("/experiments/:key/status", async (req, res) => {
    const { status } = req.body || {};
    if (!['draft', 'running', 'paused', 'stopped'].includes(status))
        return res.status(400).json({ error: "bad status" });
    await db.execute(sql `UPDATE experiments SET status=${status} WHERE key=${req.params.key}`);
    res.json({ ok: true });
});
router.get("/experiments/:key/assign", async (req, res) => {
    const ctx = ctxFromReq(req);
    const out = await assignExperiment(req.params.key, ctx);
    // record assignment if first time (best-effort; idempotent-ish)
    const subjType = ctx.userId ? 'user' : (ctx.tenantId ? 'tenant' : 'anon');
    const subjId = ctx.userId || ctx.tenantId || ctx.ip || "anon";
    const b = (out.reason?.startsWith("bucket:") ? Number(out.reason.split(":")[1].split("/")[0]) : 0);
    try {
        await db.execute(sql `
      INSERT INTO experiment_assignments(experiment_key, subject_type, subject_id, variant_key, bucket)
      VALUES (${req.params.key}, ${subjType}, ${subjId}, ${out.variant}, ${b})
      ON CONFLICT (experiment_key, subject_id) DO NOTHING
    `);
    }
    catch { }
    res.json(out);
});
router.post("/experiments/:key/event", async (req, res) => {
    const { variant, event = 'exposure', value = null, meta = {} } = req.body || {};
    const ctx = ctxFromReq(req);
    const subjType = ctx.userId ? 'user' : (ctx.tenantId ? 'tenant' : 'anon');
    const subjId = ctx.userId || ctx.tenantId || ctx.ip || "anon";
    await db.execute(sql `
    INSERT INTO experiment_events(experiment_key, variant_key, subject_type, subject_id, event, value, meta)
    VALUES (${req.params.key}, ${variant}, ${subjType}, ${subjId}, ${event}, ${value}, ${meta})
  `);
    res.json({ ok: true });
});
export default router;
