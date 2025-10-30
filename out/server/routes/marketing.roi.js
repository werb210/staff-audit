import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
const r = Router();
// Record a conversion: body { code?, experimentId?, variant?, contactId?, revenue_cents?, meta? }
r.post("/roi/convert", async (req, res) => {
    const b = req.body || {};
    await db.execute(sql `
    insert into experiment_conversions(code, experiment_id, variant, contact_id, revenue_cents, meta)
    values(${b.code || null}, ${b.experimentId || null}, ${b.variant || null}, ${b.contactId || null}, ${b.revenue_cents || 0}, ${JSON.stringify(b.meta || {})}::jsonb)
  `);
    res.json({ ok: true });
});
// ROI summary for an experiment
r.get("/roi/summary", async (req, res) => {
    const expId = req.query.experimentId;
    if (!expId)
        return res.status(400).json({ ok: false, error: "experimentId required" });
    const clicks = await db.execute(sql `select variant, sum(clicks) as clicks from short_links where experiment_id=${expId} group by variant`);
    const convs = await db.execute(sql `select coalesce(variant,'?') as variant, count(*) as convs, sum(revenue_cents) as revenue_cents from experiment_conversions where experiment_id=${expId} group by 1`);
    const costs = await db.execute(sql `select sum(cost_cents) as cost_cents from ad_costs where day >= current_date - interval '30 days' and campaign is not null`);
    res.json({ ok: true, clicks: clicks.rows, conversions: convs.rows, costs: costs.rows?.[0]?.cost_cents || 0 });
});
export default r;
