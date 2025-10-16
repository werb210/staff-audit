import { Router } from "express";
import pkg from "pg";

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optional: set ssl if your DB requires it
  ssl: process.env.DATABASE_SSL === "1" ? { rejectUnauthorized: false } : false,
});

const router = Router();

// Normalize DB row -> canonical product
function toCanonical(row) {
  const id = row.id ?? row.product_id;
  const name = row.name ?? row.product_name ?? row.productName ?? "";
  const lender_name = row.lender_name ?? row.lenderName ?? row.lender ?? "";
  const lender_id = row.lender_id ?? row.lenderId ?? null;
  const country = String(row.country ?? row.country_offered ?? row.countryOffered ?? "").toUpperCase();
  const category = row.category ?? row.product_category ?? row.productCategory ?? "";
  const min_amount = Number(row.minimum_lending_amount ?? row.min_amount ?? 0);
  const max_amount = Number(row.maximum_lending_amount ?? row.max_amount ?? Number.MAX_SAFE_INTEGER);
  const interest_rate_min = row.interest_rate_min ?? null;
  const interest_rate_max = row.interest_rate_max ?? null;
  const term_min = row.term_min_months ?? row.term_min ?? null;
  const term_max = row.term_max_months ?? row.term_max ?? null;
  const active = (row.is_active ?? row.active) !== false;

  // documents_required may be null / json / text
  let docs = [];
  try {
    const raw = row.documents_required ?? row.required_documents ?? null;
    if (Array.isArray(raw)) docs = raw;
    else if (typeof raw === "string" && raw.trim()) docs = JSON.parse(raw);
  } catch {}
  if (!Array.isArray(docs)) docs = [];

  // Ensure universal baseline: 6 months bank statements
  const hasBank6 =
    docs.some(d => (typeof d === "string" ? d === "bank_6m" : d?.key === "bank_6m"));
  if (!hasBank6) {
    docs.unshift({ key: "bank_6m", label: "Last 6 months bank statements", required: true, months: 6 });
  }

  return {
    id, name, lender_id, lender_name, country, category,
    min_amount, max_amount, interest_rate_min, interest_rate_max, term_min, term_max,
    active, required_documents: docs,
  };
}

// IMPORTANT: return ALL rows (not rows[0]) and do not slice!
// Also: deleted_at must be IS NULL (timestamp), not compared to ''.
const SQL = `
  SELECT
    p.id,
    p.name                AS name,
    p.lender_id           AS lender_id,
    l.name                AS lender_name,
    p.country             AS country,
    p.category            AS category,
    p.minimum_lending_amount AS minimum_lending_amount,
    p.maximum_lending_amount AS maximum_lending_amount,
    NULL::numeric         AS interest_rate_min,
    NULL::numeric         AS interest_rate_max,
    NULL::integer         AS term_min_months,
    NULL::integer         AS term_max_months,
    COALESCE(p.is_active, true) AS is_active,
    p.documents_required  AS documents_required
  FROM lender_products p
  LEFT JOIN lenders l ON l.id = p.lender_id
  WHERE p.deleted_at IS NULL
  ORDER BY l.name NULLS LAST, p.name ASC
`;

router.get("/api/_int/raw-products-fallback", async (req, res) => {
  try {
    const { rows } = await pool.query(SQL);
    const products = rows.map(toCanonical);
    res.json({ ok: true, total: products.length, source: "db", products });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;