import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
const r = Router();
// Heuristics:
// 1) gclid match: applications.gclid == GA4/Ads row-day window (±30d)
// 2) email match: GA4 event params (email) -> contacts.email -> applications.contact_id
// 3) campaign_id match: Ads campaign id -> applications.ad_campaign_id (last-touch)
r.post("/analytics/roi/map/run", async (_req, res) => {
    // Map Google Ads -> applications by campaign_id first (cheap baseline)
    const ads = (await db.execute(sql `select day, customer_id, campaign_id, cost_micros, conversions from gads_stats where day >= current_date - 60`)).rows;
    let n = 0;
    for (const a of ads) {
        const apps = (await db.execute(sql `
      select id, contact_id from applications where ad_platform='google_ads' and ad_campaign_id=${String(a.campaign_id || '')}
    `)).rows;
        for (const app of apps) {
            await db.execute(sql `
        insert into roi_mappings(applicationId, contact_id, source, campaign_id, day, cost_micros, conversions)
        values(${app.id}, ${app.contact_id}, 'google_ads', ${String(a.campaign_id || '')}, ${a.day}, ${Number(a.cost_micros || 0)}, ${Number(a.conversions || 0)})
        on conflict do nothing
      `);
            n++;
        }
    }
    // Map GA4 events -> applications via gclid (best-effort; uses ga4_conversions.event_name as event)
    const ga4 = (await db.execute(sql `select day, event_name, value, count from ga4_conversions where day >= current_date - 60`)).rows;
    for (const g of ga4) {
        // If gclid was captured on contacts/apps (from your landing page), map by day +/- 30
        const apps = (await db.execute(sql `select id, contact_id from applications where gclid is not null and createdAt between ${g.day}::date - 30 and ${g.day}::date + 30`)).rows;
        for (const app of apps) {
            await db.execute(sql `
        insert into roi_mappings(applicationId, contact_id, source, event_name, day, revenue_cents)
        values(${app.id}, ${app.contact_id}, 'ga4', ${g.event_name}, ${g.day}, ${Math.round(Number(g.value || 0) * 100)})
        on conflict do nothing
      `);
            n++;
        }
    }
    res.json({ ok: true, mapped: n });
});
r.get("/analytics/roi/summary", async (_req, res) => {
    // Aggregate CAC/ROAS per campaign (google_ads only), joined with funded deals for revenue
    const { rows: spend } = await db.execute(sql `
    select campaign_id, sum(cost_micros)::bigint as cost_micros, sum(conversions)::float as conversions
    from roi_mappings where source='google_ads' and day >= current_date - 60 group by campaign_id
  `);
    const { rows: rev } = await db.execute(sql `
    select m.campaign_id, sum(coalesce(m.revenue_cents,0))::int as revenue_cents
    from roi_mappings m
    left join applications a on a.id = m.applicationId
    where m.day >= current_date - 60 and a.funded = true
    group by m.campaign_id
  `);
    const m = new Map();
    for (const s of spend)
        m.set(s.campaign_id || 'unknown', { campaign_id: s.campaign_id || 'unknown', cost_micros: Number(s.cost_micros || 0), conversions: Number(s.conversions || 0), revenue_cents: 0 });
    for (const r2 of rev) {
        const k = r2.campaign_id || 'unknown';
        m.set(k, { ...(m.get(k) || { campaign_id: k, cost_micros: 0, conversions: 0 }), revenue_cents: Number(r2.revenue_cents || 0) });
    }
    const rows = [...m.values()].map(x => {
        const cost = x.cost_micros / 1_000_000; // to currency
        const conv = x.conversions || 0;
        const revenue = (x.revenue_cents || 0) / 100;
        const cac = conv > 0 ? (cost / conv) : null;
        const roas = cost > 0 ? (revenue / cost) : null;
        return { campaign_id: x.campaign_id, cost, conversions: conv, revenue, cac, roas };
    });
    res.json({ ok: true, rows });
});
export default r;
