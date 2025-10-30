import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
async function q(s, ...v) {
    return (await db.execute(sql.raw(String.raw(s, ...v)))).rows;
}
(async () => {
    const out = { ts: new Date().toISOString(), ok: true, db: {} };
    out.db.tenants = {
        applications: await q `SELECT tenant_id, COUNT(*)::int cnt FROM "applications" GROUP BY tenant_id`,
        contacts: await q `SELECT tenant, COUNT(*)::int cnt FROM "contacts" GROUP BY tenant`
    };
    out.db.contacts = {
        duplicatesByEmail: await q `
      SELECT tenant, email, COUNT(*)::int cnt
      FROM "contacts" WHERE email IS NOT NULL
      GROUP BY tenant, email HAVING COUNT(*)>1
      ORDER BY cnt DESC LIMIT 20`,
        duplicatesByPhone: await q `
      SELECT tenant, phone, COUNT(*)::int cnt
      FROM "contacts" WHERE phone IS NOT NULL
      GROUP BY tenant, phone HAVING COUNT(*)>1
      ORDER BY cnt DESC LIMIT 20`
    };
    out.db.lenders = {
        duplicatesByName: await q `
      SELECT tenant, lower(coalesce(contact_name,company_name)) AS name_key, COUNT(*)::int cnt
      FROM "lenders" GROUP BY tenant, name_key HAVING COUNT(*)>1
      ORDER BY cnt DESC LIMIT 20`
    };
    out.db.lenderProducts = {
        duplicatesByCompositeKey: await q `
      SELECT tenant_id, lender_id, lower(name) AS name_key, coalesce(term_min,-1) AS term_key, COUNT(*)::int cnt
      FROM "lender_products"
      GROUP BY tenant_id,lender_id,name_key,term_key HAVING COUNT(*)>1
      ORDER BY cnt DESC LIMIT 20`
    };
    out.db.nullTenants = (await q `SELECT
     (SELECT COUNT(*)::int FROM "contacts" WHERE tenant IS NULL) AS contacts,
     (SELECT COUNT(*)::int FROM "lenders" WHERE tenant IS NULL) AS lenders,
     (SELECT COUNT(*)::int FROM "lender_products" WHERE tenant_id IS NULL) AS products,
     (SELECT COUNT(*)::int FROM "applications" WHERE tenant_id IS NULL) AS apps
  `)[0];
    console.log(JSON.stringify(out, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
