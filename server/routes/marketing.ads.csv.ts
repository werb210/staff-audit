import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";

const r = Router();

// POST body: { audienceId, campaign, adgroup, headline, desc, finalUrlBase }
r.post("/marketing/ads/csv", async (req: any, res: any) => {
  const { audienceId, campaign, adgroup, headline, desc, finalUrlBase } = req.body || {};
  const { rows: audRows } = await db.execute(sql`select filter from audiences where id=${audienceId} limit 1`);
  const filter = audRows?.[0]?.filter || {};
  const tagList = (filter.tags || []) as string[];
  const where = tagList.length ? sql`where tags && ${tagList}::text[]` : sql``;
  const contacts = await db.execute(sql`select full_name, email, company from contacts ${where}`);

  const header = ["Campaign", "Ad group", "Headline", "Description", "Final URL"];
  const lines = [header.join(",")];
  for (const c of contacts.rows) {
    const url = `${finalUrlBase}?utm_source=google&utm_medium=cpc&utm_campaign=${encodeURIComponent(campaign || 'bulk')}`;
    lines.push([campaign, adgroup, headline, desc, url].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(","));
  }
  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="google-ads-${Date.now()}.csv"`);
  res.send(csv);
});

// Optional: import daily costs (CSV text in body { rows:[{day,campaign,cost_cents},...] })
r.post("/marketing/ads/costs", async (req: any, res: any) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  for (const r of rows) {
    await db.execute(sql`insert into ad_costs(source,campaign,day,cost_cents) values('google_ads', ${r.campaign || null}, ${r.day}, ${r.cost_cents || 0})`);
  }
  res.json({ ok: true, inserted: rows.length });
});

export default r;