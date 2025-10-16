import express from "express";
import { Pool } from "pg";
import { optionalAuth } from "../auth/optional-auth.mjs";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const router = express.Router();

router.use(optionalAuth());

/** GET /api/catalog/categories?amount=50000&country=CA&tenantId=...&includeInactive=1 */
router.get("/api/catalog/categories", async (req, res) => {
  try {
    const amount  = Number(req.query.amount ?? 0);
    const country = String(req.query.country ?? "").toUpperCase();
    const tenant  = req.query.tenantId || null;
    const includeInactive = String(req.query.includeInactive ?? "1") === "1";
    if (!amount || !country) return res.status(412).json({ asks:["Provide amount (number) and country (US|CA)"]});

    const params = [amount, amount, country];
    let where = "min_amount <= $1 AND (max_amount IS NULL OR max_amount >= $2) AND country = $3";
    where += includeInactive ? " AND (active IS NOT FALSE)" : " AND (active IS TRUE)";  // NULL counts as active

    if (tenant) { params.push(tenant); where += ` AND tenant_id = $${params.length}`; }

    const { rows } = await pool.query(
      `SELECT DISTINCT category FROM crm_lender_products_canon WHERE ${where} ORDER BY category`, params
    );

    res.json({ amount, country, includeInactive, categories: rows.map(r=>r.category) });
  } catch (e) {
    res.status(500).json({ error: "categories lookup failed", detail: String(e.message||e) });
  }
});

// NOTE: Legacy /api/lender-products route moved to catalog-sanity.mjs for better data handling

// PUBLIC: full product export for client catalog
router.get("/api/catalog/export-products", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.lender_id,
        l.name AS lender_name,
        p.country::text AS country,
        p.category::text AS category,
        p.min_amount,
        p.max_amount,
        p.active
      FROM crm_lender_products_canon p
      LEFT JOIN lenders l ON l.id = p.lender_id
      ORDER BY l.name NULLS LAST, p.name
    `);

    // include stable + legacy keys (no defaults here)
    const products = rows.map((r) => ({
      id: r.id,
      name: r.name,
      lender_id: r.lender_id,
      lender_name: r.lender_name,
      country: r.country,                 // "US" | "CA"
      category: r.category,               // canonical
      productCategory: r.category,        // legacy alias for older clients
      min_amount: r.min_amount,
      max_amount: r.max_amount,
      active: !!r.active,
    }));

    res.json({ total: products.length, products });
  } catch (err) {
    res.status(500).json({ error: "export_failed" });
  }
});

/** Diagnostics: GET /api/catalog/country-counts */
router.get("/api/catalog/country-counts", async (_req, res) => {
  try{
    const { rows } = await pool.query(`
      SELECT country,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE active IS TRUE)        AS active_true,
             COUNT(*) FILTER (WHERE active IS NOT FALSE)   AS active_true_or_null
      FROM crm_lender_products_canon
      GROUP BY country ORDER BY country`);
    res.json(rows);
  }catch(e){ res.status(500).json({ error:"country-counts failed", detail:String(e.message||e) }); }
});

export default router;