import { db } from "../db";
import { sql } from "drizzle-orm";

export async function computeDaily(dayISO: string) {
  const r1 = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM contacts WHERE DATE(createdAt)=${dayISO}) AS leads_new,
      (SELECT COUNT(*) FROM applications WHERE DATE(createdAt)=${dayISO}) AS apps_created,
      (SELECT COUNT(*) FROM applications WHERE funded_at IS NOT NULL AND DATE(funded_at)=${dayISO}) AS apps_funded,
      (SELECT COALESCE(SUM(amount_funded),0) FROM applications WHERE funded_at IS NOT NULL AND DATE(funded_at)=${dayISO}) AS funded_amount,
      (SELECT COUNT(*) FROM documents WHERE DATE(createdAt)=${dayISO}) AS docs_uploaded,
      (SELECT COUNT(*) FROM comm_messages WHERE direction='in'  AND DATE(createdAt)=${dayISO}) AS messages_in,
      (SELECT COUNT(*) FROM comm_messages WHERE direction='out' AND DATE(createdAt)=${dayISO}) AS messages_out
  `);
  const row = r1.rows?.[0] || {};
  
  await db.execute(sql`
    INSERT INTO analytics_daily(day, leads_new, apps_created, apps_funded, funded_amount, messages_in, messages_out, updatedAt)
    VALUES (${dayISO}, ${row.leads_new||0}, ${row.apps_created||0}, ${row.apps_funded||0}, ${row.funded_amount||0}, ${row.messages_in||0}, ${row.messages_out||0}, now())
    ON CONFLICT (day) DO UPDATE SET
      leads_new=EXCLUDED.leads_new,
      apps_created=EXCLUDED.apps_created,
      apps_funded=EXCLUDED.apps_funded,
      funded_amount=EXCLUDED.funded_amount,
      messages_in=EXCLUDED.messages_in,
      messages_out=EXCLUDED.messages_out,
      updatedAt=now()
  `);
}

export async function getSummary(fromISO: string, toISO: string) {
  const r = await db.execute(sql`
    SELECT * FROM analytics_daily
    WHERE day BETWEEN ${fromISO}::date AND ${toISO}::date
    ORDER BY day ASC
  `);
  const rows = r.rows || [];
  const totals = rows.reduce((a:any, x:any)=>({
    leads_new: a.leads_new + Number(x.leads_new||0),
    apps_created: a.apps_created + Number(x.apps_created||0),
    apps_funded: a.apps_funded + Number(x.apps_funded||0),
    funded_amount: a.funded_amount + Number(x.funded_amount||0),
    messages_in: a.messages_in + Number(x.messages_in||0),
    messages_out: a.messages_out + Number(x.messages_out||0)
  }), { leads_new:0, apps_created:0, apps_funded:0, funded_amount:0, messages_in:0, messages_out:0 });
  return { rows, totals };
}

export async function getRealTimeStats() {
  const today = new Date().toISOString().split('T')[0];
  const r = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM applications WHERE status='pending') AS pending_apps,
      (SELECT COUNT(*) FROM applications WHERE status='approved') AS approved_apps,
      (SELECT COUNT(*) FROM applications WHERE status='funded') AS funded_apps,
      (SELECT COUNT(*) FROM documents WHERE createdAt::date = ${today}) AS docs_today,
      (SELECT COUNT(*) FROM comm_messages WHERE createdAt::date = ${today}) AS messages_today,
      (SELECT COUNT(*) FROM lender_partners) AS total_lenders,
      (SELECT COUNT(*) FROM doc_requests WHERE status='pending') AS pending_requests
  `);
  return r.rows?.[0] || {};
}