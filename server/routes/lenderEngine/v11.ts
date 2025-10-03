import { Router } from "express";
// REMOVED: requirePermission from authz service (authentication system deleted)
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { runEngine11 } from "../../services/engine/v11";

const router = Router();

router.post("/run/:applicationId", async (req:any, res)=>{
  const variant = String(req.query.variant || process.env.ENGINE_VARIANT_DEFAULT || "prod");
  res.json(await runEngine11(req.params.applicationId, variant));
});

router.get("/policies", async (_req,res)=>{
  const r = await db.execute(sql`SELECT id, scope, rule, created_at FROM engine_policies ORDER BY created_at DESC`);
  res.json(r.rows || []);
});

router.post("/policies", async (req:any,res)=>{
  const { scope, rule } = req.body || {};
  const ins = await db.execute(sql`INSERT INTO engine_policies(scope, rule, created_by_user_id) VALUES (${scope}, ${rule}, ${req.user?.id || null}) RETURNING id`);
  res.json({ ok:true, id: ins.rows?.[0]?.id });
});

router.delete("/policies/:id", async (req:any,res)=>{
  await db.execute(sql`DELETE FROM engine_policies WHERE id=${req.params.id}`);
  res.json({ ok:true });
});

router.post("/products/:key/knobs", async (req:any,res)=>{
  await db.execute(sql`UPDATE lender_products SET knobs=${JSON.stringify(req.body||{})} WHERE key=${req.params.key}`);
  res.json({ ok:true });
});

router.get("/trace/:applicationId/latest", async (req:any,res)=>{
  const r = await db.execute(sql`
    SELECT id, variant, results, rules_applied, inputs, created_at
    FROM decision_traces WHERE application_id=${req.params.applicationId}
    ORDER BY created_at DESC LIMIT 1
  `);
  res.json(r.rows?.[0] || null);
});

router.get("/variants", async (_req,res)=>{
  const r = await db.execute(sql`SELECT key, weights, created_at FROM engine_variants ORDER BY created_at`);
  res.json(r.rows || []);
});

router.put("/variants/:key", async (req:any,res)=>{
  const { weights } = req.body || {};
  await db.execute(sql`UPDATE engine_variants SET weights=${JSON.stringify(weights)} WHERE key=${req.params.key}`);
  res.json({ ok:true });
});

export default router;