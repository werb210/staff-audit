import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
const r = Router();
// Time-series banking metrics for an application
r.get("/ai/banking/:applicationId/series", async (req, res) => {
    const appId = req.params.applicationId;
    const days = Math.min(365, Number(req.query.days || 180));
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const { rows } = await db.execute(sql `
    select posted_at::date as d, sum(amount_cents) as net_cents,
           sum(case when amount_cents>0 then amount_cents else 0 end) as inflow_cents,
           sum(case when amount_cents<0 then amount_cents else 0 end) as outflow_cents,
           sum(case when lower(coalesce(type,''))='nsf' then 1 else 0 end) as nsf
    from bank_tx
    where applicationId=${appId} and posted_at>=${since}
    group by d order by d
  `);
    // simple anomaly: day net < -2*median(outflow) or nsf>0
    const outflows = rows.map(r => Math.abs(Number(r.outflow_cents || 0))).filter(n => n > 0).sort((a, b) => a - b);
    const med = outflows.length ? outflows[Math.floor(outflows.length / 2)] : 0;
    const anomalies = rows.filter(r => Number(r.net_cents) < (-2 * med) || Number(r.nsf) > 0).map(r => r.d);
    res.json({ ok: true, series: rows, anomalies, medianOutflow: med });
});
export default r;
