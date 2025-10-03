import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { getCurrentPlan, summary, meter } from "../../services/billing/core";

const router = Router();

router.get("/plans", async (_req,res)=>{
  const r = await db.execute(sql`SELECT key, name, monthly_price_cents, limits FROM billing_plans ORDER BY monthly_price_cents NULLS LAST, key`);
  res.json(r.rows || []);
});

router.post("/plans", async (req,res)=>{
  const { key, name, monthly_price_cents=0, limits={} } = req.body || {};
  if (!key || !name) return res.status(400).json({ error:"key and name required" });
  await db.execute(sql`
    INSERT INTO billing_plans(key, name, monthly_price_cents, limits)
    VALUES (${key}, ${name}, ${monthly_price_cents}, ${limits})
    ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name, monthly_price_cents=EXCLUDED.monthly_price_cents, limits=EXCLUDED.limits, updated_at=now()
  `);
  res.json({ ok:true });
});

router.get("/subscription", async (_req,res)=>{
  res.json(await getCurrentPlan());
});

router.post("/subscription", async (req,res)=>{
  const plan_key = String(req.body?.plan_key || "");
  if (!plan_key) return res.status(400).json({ error:"plan_key required" });
  await db.execute(sql`
    UPDATE subscriptions SET plan_key=${plan_key}, started_at=now(), canceled_at=NULL WHERE tenant_key='default';
  `);
  // if row didn't exist, insert
  const r = await db.execute(sql`SELECT 1 FROM subscriptions WHERE tenant_key='default'`);
  if (!r.rows?.[0]) await db.execute(sql`INSERT INTO subscriptions(tenant_key, plan_key) VALUES ('default', ${plan_key})`);
  res.json({ ok:true });
});

router.get("/usage", async (_req,res)=>{
  res.json(await summary());
});

router.post("/meter", async (req,res)=>{
  const { metric, qty=1, ref_type=null, ref_id=null, meta={} } = req.body || {};
  if (!metric) return res.status(400).json({ error:"metric required" });
  const out = await meter({ metric, qty: Number(qty||1), ref_type, ref_id, meta });
  if (out?.over_limit) return res.status(402).json(out); // "Payment Required" when hard-capped
  res.json(out);
});

export default router;