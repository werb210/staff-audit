import express from "express";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const router = express.Router();

/** Helpers */
async function firstExistingTable(candidates) {
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name = ANY ($1) LIMIT 1`, [candidates]
  );
  return rows[0]?.table_name || null;
}

async function existingCols(table) {
  if (!table) return new Set();
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`, [table]
  );
  return new Set(rows.map(r => r.column_name));
}

function pick(colsSet, tableAlias, choices, asAlias, fallbackType = "text") {
  for (const c of choices) {
    if (c.includes("||")) continue; // skip expressions here
    if (colsSet.has(c)) return `${tableAlias}."${c}" AS ${asAlias}`;
  }
  // expressions last (if they reference existing columns)
  for (const expr of choices.filter(x => x.includes("||"))) {
    const parts = expr.split("||").map(s => s.replace(/[^a-zA-Z_]/g, "").trim()).filter(Boolean);
    if (parts.every(p => colsSet.has(p))) return `${expr} AS ${asAlias}`;
  }
  return `NULL::${fallbackType} AS ${asAlias}`;
}

/** GET /api/pipeline-cards?limit=200&tenantId=... */
router.get("/api/pipeline-cards", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "200"), 10) || 200, 1000);
    const tenantId = req.query.tenantId || null;

    // Candidate application table names
    const appTable = await firstExistingTable([
      "applications","loan_applications","sales_applications","deals","crm_applications"
    ]);
    if (!appTable) return res.status(200).json([]);

    const cols = await existingCols(appTable);
    const a = "a"; // alias

    // Field picks (text/numeric)
    const sel = [];
    sel.push(cols.has("id") ? `${a}."id"::text AS applicationId` : `md5(random()::text) AS applicationId`);
    sel.push(pick(cols, a, ["borrower_name","applicant_name","contact_name","primary_contact_name","first_name || ' ' || last_name"], "borrower_name", "text"));
    sel.push(pick(cols, a, ["company_name","business_name","org_name"], "company_name", "text"));
    sel.push(pick(cols, a, ["stage","pipeline_stage","status_stage"], "stage", "text"));
    sel.push(pick(cols, a, ["status","application_status"], "status", "text"));
    sel.push(pick(cols, a, ["amount_requested","requested_amount","loan_amount","amount"], "amount", "numeric"));
    sel.push(pick(cols, a, ["lender_product_id"], "lender_product_id", "text"));
    sel.push(pick(cols, a, ["lender_id"], "a_lender_id", "text"));
    sel.push(pick(cols, a, ["product_name","product","product_type"], "a_product_name", "text"));
    sel.push(pick(cols, a, ["country","country_offered"], "a_country", "text"));
    sel.push(pick(cols, a, ["updatedAt","modified_at","createdAt"], "updatedAt", "timestamptz"));

    // Build SQL with two-stage product match: by id OR by (lender_id+name+country)
    const baseSelect = `
      SELECT ${sel.join(", ") }
      FROM "${appTable}" ${a}
      ${tenantId ? `WHERE ${a}."tenant_id" = $1 OR ${a}."tenant"::text = $1` : ""}
      ORDER BY updatedAt DESC NULLS LAST
      LIMIT ${limit}
    `;
    const params = tenantId ? [tenantId] : [];

    const { rows: apps } = await pool.query(baseSelect, params);

    // Fetch products + lenders once (for quick in-memory join)
    const [{ rows: prods }, { rows: lenders }] = await Promise.all([
      pool.query(`SELECT * FROM crm_lender_products_canon`),
      pool.query(`SELECT id::text, name FROM lenders`),
    ]);
    const lenderById = new Map(lenders.map(l => [l.id, l.name]));
    // Index products by (lender_id|name|country)
    const prodById = new Map(prods.map(p => [String(p.id), p]));
    const prodByKey = new Map();
    for (const p of prods) {
      const key = `${p.lender_id}|${(p.name||"").toLowerCase()}|${p.country}`;
      if (!prodByKey.has(key)) prodByKey.set(key, []);
      prodByKey.get(key).push(p);
    }

    const cards = apps.map(a => {
      // 1) try direct id match
      let p = a.lender_product_id ? prodById.get(String(a.lender_product_id)) : null;
      // 2) fallback by key
      if (!p) {
        const lid = a.a_lender_id || null;
        const pname = (a.a_product_name || "").toLowerCase();
        const ctry = a.a_country || null;
        if (lid && pname && ctry) {
          const arr = prodByKey.get(`${lid}|${pname}|${ctry}`) || [];
          // Prefer active, then richest amounts
          p = arr.sort((x,y) =>
            (y.active - x.active) ||
            ((y.max_amount||0) - (x.max_amount||0)) ||
            ((y.min_amount||0) - (x.min_amount||0))
          )[0] || null;
        }
      }
      const lender_name = a.a_lender_id ? (lenderById.get(String(a.a_lender_id)) || null) : null;
      return {
        applicationId: a.applicationId,
        borrower_name: a.borrower_name,
        company_name: a.company_name,
        stage: a.stage,
        status: a.status,
        amount: a.amount,
        lender_name,
        product_name: p?.name || a.a_product_name || null,
        category: p?.category || null,
        country: p?.country || a.a_country || null,
        min_amount: p?.min_amount ?? null,
        max_amount: p?.max_amount ?? null,
        active: p?.active ?? null,
        updatedAt: a.updatedAt,
      };
    });

    res.json(cards);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "pipeline-cards failed", detail: String(e.message || e) });
  }
});

/** GET /api/contact-cards?limit=200&tenantId=... */
router.get("/api/contact-cards", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "200"), 10) || 200, 1000);
    const tenantId = req.query.tenantId || null;

    const contactsTable = await firstExistingTable([
      "contacts","crm_contacts","people","applicants","leads"
    ]);
    if (!contactsTable) return res.status(200).json([]);

    const ccols = await existingCols(contactsTable);
    const c = "c";

    // choose contact id/name/email/phone/company
    const idExpr    = ccols.has("id") ? `${c}."id"::text AS contact_id` :
                      ccols.has("contact_id") ? `${c}."contact_id"::text AS contact_id` :
                      `md5(random()::text) AS contact_id`;
    const nameExpr  = ccols.has("name") ? `${c}."name" AS name` :
                      ccols.has("first_name") && ccols.has("last_name") ? `${c}."first_name" || ' ' || ${c}."last_name" AS name` :
                      ccols.has("first_name") ? `${c}."first_name" AS name` :
                      `NULL::text AS name`;
    const emailExpr = ccols.has("email") ? `${c}."email" AS email` :
                      ccols.has("primary_email") ? `${c}."primary_email" AS email` :
                      `NULL::text AS email`;
    const phoneExpr = ccols.has("phone") ? `${c}."phone" AS phone` :
                      ccols.has("mobile") ? `${c}."mobile" AS phone` :
                      `NULL::text AS phone`;
    const compExpr  = ccols.has("company_name") ? `${c}."company_name" AS company_name` :
                      ccols.has("business_name") ? `${c}."business_name" AS company_name` :
                      `NULL::text AS company_name`;

    const baseContactsSQL = `
      SELECT ${idExpr}, ${nameExpr}, ${emailExpr}, ${phoneExpr}, ${compExpr}
      FROM "${contactsTable}" ${c}
      ${tenantId ? `WHERE ${c}."tenant_id" = $1 OR ${c}."tenant"::text = $1` : ""}
      ORDER BY ${c}."updatedAt" DESC NULLS LAST, ${c}."createdAt" DESC NULLS LAST
      LIMIT ${limit}
    `;
    const params = tenantId ? [tenantId] : [];
    const { rows: contacts } = await pool.query(baseContactsSQL, params);

    // Try to count linked applications if both sides have a contact id
    const appTable = await firstExistingTable([
      "applications","loan_applications","sales_applications","deals","crm_applications"
    ]);
    let appsByContact = new Map();
    if (appTable) {
      const acols = await existingCols(appTable);
      const possibleAppContactCols = ["contact_id","primary_contact_id","applicant_id","person_id"];
      const appContactCol = possibleAppContactCols.find(col => acols.has(col));
      const contactIdCol  = ["id","contact_id","person_id","applicant_id"].find(col => ccols.has(col)) || "id";

      if (appContactCol) {
        const { rows } = await pool.query(
          `SELECT ${appContactCol}::text AS cid, COUNT(*) AS cnt
           FROM "${appTable}"
           GROUP BY ${appContactCol}`
        );
        appsByContact = new Map(rows.map(r => [String(r.cid), Number(r.cnt)]));
      }
    }

    const out = contacts.map(c => ({
      contact_id: c.contact_id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company_name: c.company_name,
      applications_count: appsByContact.get(String(c.contact_id)) || 0,
    }));

    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "contact-cards failed", detail: String(e.message || e) });
  }
});

export default router;