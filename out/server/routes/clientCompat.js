import { Router } from "express";
import { pool } from "../db/drizzle";
const getTenant = (req) => (String(req.headers["x-tenant"] || req.query.tenant || "bf").toLowerCase() === "slf" ? "slf" : "bf");
async function pickTable(cands) {
    const q = `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])`;
    const { rows } = await pool.query(q, [cands]);
    for (const c of cands)
        if (rows.find(r => r.table_name === c))
            return c;
    return null;
}
let T = null;
async function ensureTables() {
    if (T)
        return T;
    const lender = await pickTable(["Lender", "lenders"]);
    const product = await pickTable(["LenderProduct", "lender_products"]);
    if (!lender || !product)
        throw new Error(`Missing tables. Lender:${lender} Product:${product}`);
    T = { Lender: lender, Product: product };
    return T;
}
function asBool(x, def = true) {
    if (x === undefined || x === null || x === "")
        return def;
    const s = String(x).toLowerCase();
    return ["1", "true", "yes", "y"].includes(s);
}
function asNum(x) { if (x === undefined || x === null || x === "")
    return null; const n = Number(x); return isFinite(n) ? n : null; }
function normStr(x) { return (x ?? "").toString().trim(); }
// ---------- Router ----------
const r = Router();
/**
 * GET /api/client-compat/lenders
 * Mirrors client GET /api/lenders (products listing) with filters + pagination
 * Query: geography[], product_type, min_amount, max_amount, industries[], lender_name, is_active, page, limit
 * Returns: { products, total, page, limit }
 */
r.get("/lenders", async (req, res) => {
    try {
        const { Lender, Product } = await ensureTables();
        const tenant = getTenant(req);
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const offset = (page - 1) * limit;
        const lenderName = normStr(req.query.lender_name);
        const productType = normStr(req.query.product_type);
        const isActive = asBool(req.query.is_active, true);
        const minAmount = asNum(req.query.min_amount);
        const maxAmount = asNum(req.query.max_amount);
        const geos = [].concat(req.query.geography || []).filter(Boolean).map(String);
        const inds = [].concat(req.query.industries || []).filter(Boolean).map(String);
        // Build WHEREs - for now, skip tenant filtering to get all products for testing
        // TODO: Fix tenant UUID mapping issue between lenders.tenant (string) and lender_products.tenant_id (uuid)
        const where = [`1=1`]; // temporary - show all products regardless of tenant
        const params = []; // Remove tenant parameter since we're not using it
        let i = params.length;
        if (isActive) {
            where.push(`(p.is_active IS NULL OR p.is_active = true)`);
        }
        if (lenderName) {
            params.push(`%${lenderName.toLowerCase()}%`);
            i++;
            where.push(`(lower(coalesce(l.company_name, l.contact_name)) LIKE $${i})`);
        }
        if (productType) {
            params.push(productType.toLowerCase());
            i++;
            where.push(`(lower(p.category::text) = $${i} OR lower(p.name) LIKE '%' || $${i} || '%')`);
        }
        if (minAmount != null) {
            params.push(minAmount);
            i++;
            where.push(`(p.amount_min IS NULL OR p.amount_min >= $${i})`);
        }
        if (maxAmount != null) {
            params.push(maxAmount);
            i++;
            where.push(`(p.amount_max IS NULL OR p.amount_max <= $${i})`);
        }
        if (geos.length) {
            params.push(geos.map(g => g.toLowerCase()));
            i++;
            where.push(`(p.geography IS NULL OR lower(p.geography::text) SIMILAR TO '%(${geos.join("|").toLowerCase()})%')`);
        }
        if (inds.length) {
            params.push(inds.map(g => g.toLowerCase()));
            i++;
            where.push(`(p.industries IS NULL OR lower(p.industries::text) SIMILAR TO '%(${inds.join("|").toLowerCase()})%')`);
        }
        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const countSQL = `
      SELECT COUNT(*)::int AS n
      FROM "${Product}" p
      LEFT JOIN "${Lender}" l ON l.id = p.lender_id
      ${whereSQL}
    `;
        const listSQL = `
      SELECT
        p.id,
        p.lender_id,
        coalesce(l.company_name, l.contact_name) AS lender_name,
        p.name,
        p.description,
        p.is_active::text AS status,
        p.category,
        p.term_max AS term_months,
        p.amount_min AS min_amount,
        p.amount_max AS max_amount,
        p.createdAt, p.updatedAt
      FROM "${Product}" p
      LEFT JOIN "${Lender}" l ON l.id = p.lender_id
      ${whereSQL}
      ORDER BY coalesce(l.company_name, l.contact_name), p.name
      LIMIT ${limit} OFFSET ${offset}
    `;
        const [{ rows: [{ n: total = 0 } = { n: 0 }] }, { rows }] = await Promise.all([
            pool.query(countSQL, params),
            pool.query(listSQL, params),
        ]);
        return res.json({ products: rows, total, page, limit });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});
/** GET /api/client-compat/lenders/:id  */
r.get("/lenders/:id", async (req, res) => {
    try {
        const { Product, Lender } = await ensureTables();
        const tenant = getTenant(req);
        const { id } = req.params;
        const sql = `
      SELECT p.*, coalesce(l.company_name, l.contact_name) AS lender_name
      FROM "${Product}" p
      LEFT JOIN "${Lender}" l ON l.id = p.lender_id
      WHERE p.id = $1 AND lower(p.tenant_id::text) = lower($2)
      LIMIT 1
    `;
        const { rows } = await pool.query(sql, [id, tenant]);
        if (!rows.length)
            return res.status(404).json({ ok: false, error: "not_found" });
        // numeric conversions (mirror client)
        const r = rows[0];
        if (r.amount_min != null)
            r.min_amount = Number(r.amount_min);
        if (r.amount_max != null)
            r.max_amount = Number(r.amount_max);
        if (r.term_max != null)
            r.term_months = Number(r.term_max);
        return res.json(r);
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});
/** GET /api/client-compat/lenders/categories/summary */
r.get("/lenders/categories/summary", async (req, res) => {
    try {
        const { Product } = await ensureTables();
        const tenant = getTenant(req);
        const sql = `
      SELECT CASE WHEN p.category IS NULL THEN 'term_loan' ELSE lower(p.category::text) END AS category,
             COUNT(*)::int AS count,
             MIN(p.amount_min) AS min_amount,
             MAX(p.amount_max) AS max_amount,
             AVG(NULLIF(p.term_max,0))::int AS avg_term_months
      FROM "${Product}" p
      WHERE 1=1
      GROUP BY 1
      ORDER BY 2 DESC
    `;
        const { rows } = await pool.query(sql, []); // No parameters needed since WHERE 1=1
        return res.json({ categories: rows });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});
/** GET /api/client-compat/lenders/required-documents/:category */
r.get("/lenders/required-documents/:category", async (req, res) => {
    try {
        const { Product } = await ensureTables();
        const tenant = getTenant(req);
        const category = String(req.params.category || "").toLowerCase();
        // If you store per-product required docs in a JSON column (e.g., requiredDocuments), aggregate them
        const sql = `
      SELECT p.doc_requirements AS docs
      FROM "${Product}" p
      WHERE lower(p.tenant_id::text) = lower($1) AND lower(coalesce(p.category::text,'')) = $2
      AND p.doc_requirements IS NOT NULL
      LIMIT 100
    `;
        const { rows } = await pool.query(sql, [tenant, category]);
        const merged = [];
        for (const r of rows) {
            try {
                const list = Array.isArray(r.docs) ? r.docs : JSON.parse(r.docs || "[]");
                merged.push(...list);
            }
            catch { /* ignore parse errors */ }
        }
        return res.json({ items: merged });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});
/** POST /api/client-compat/public/applications  (maps client payload → Staff DB) */
r.post("/public/applications", async (req, res) => {
    try {
        const tenant = getTenant(req);
        const body = req.body || {};
        const step1 = body.step1 || {};
        const step3 = body.step3 || {};
        const step4 = body.step4 || {};
        // Minimal upsert: create Contact (by email) then Application
        const contactEmail = (step4.email || step3.businessEmail || "").toLowerCase().trim();
        if (!contactEmail)
            return res.status(400).json({ ok: false, error: "missing_contact_email" });
        // Detect Contact table
        const contactTable = await pickTable(["Contact", "contacts"]);
        const appTable = await pickTable(["Application", "applications"]);
        if (!contactTable || !appTable)
            throw new Error("Contact/Application tables missing");
        // CONTACT upsert by email+tenant - use snake_case columns
        const selC = `SELECT id FROM "${contactTable}" WHERE lower(tenant)=lower($1) AND lower(email)=lower($2) LIMIT 1`;
        const found = await pool.query(selC, [tenant, contactEmail]);
        let contactId = found.rows[0]?.id;
        if (!contactId) {
            const insC = `
        INSERT INTO "${contactTable}" (id, tenant, first_name, last_name, full_name, email, phone, company_name, createdAt, updatedAt)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now(), now())
        RETURNING id
      `;
            const first = step4.firstName || null;
            const last = step4.lastName || null;
            const fullName = [first, last].filter(Boolean).join(' ').trim() || null;
            const phone = step4.phone || step3.businessPhone || null;
            const company = step3.businessName || step3.legalBusinessName || null;
            const insRes = await pool.query(insC, [tenant, first, last, fullName, contactEmail, phone, company]);
            contactId = insRes.rows[0].id;
        }
        // APPLICATION create - use valid stage enum value, include required user_id 
        const insA = `
      INSERT INTO "${appTable}" (id, tenant_id, contact_id, user_id, requested_amount, use_of_funds, stage, createdAt, updatedAt)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'New', now(), now())
      RETURNING id
    `;
        const amount = step1.requestedAmount ? Number(step1.requestedAmount) : null;
        const useOfFunds = step1.useOfFunds || null;
        // Use 00000000-0000-0000-0000-000000000000 as tenant_id UUID format  
        const tenantUuid = '00000000-0000-0000-0000-000000000000';
        // Use contactId as user_id since they're the same person in this context
        const appRes = await pool.query(insA, [tenantUuid, contactId, contactId, amount, useOfFunds]);
        const appId = appRes.rows[0].id;
        return res.json({ ok: true, applicationId: appId, status: "received" });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});
export default r;
