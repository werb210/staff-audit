import express from "express";
export const router = express.Router();

function pickCategory(p) {
  const c = (p.productCategory || p.category || "").trim();
  if (c) return c;
  const n = (p.productName || p.name || "").toLowerCase();
  if (n.includes("equipment")) return "Equipment Financing";
  if (n.includes("purchase order") || n.includes("po ")) return "Purchase Order Financing";
  if (n.includes("invoice") || n.includes("factoring")) return "Invoice Factoring";
  if (n.includes("term")) return "Term Loan";
  if (n.includes("line") || n.includes("revolver")) return "Business Line of Credit";
  return "Working Capital";
}
function normalizeCountry(p) {
  let c = String(p.country || p.countryOffered || "").trim().toUpperCase();
  if (!c) {
    const n = String(p.productName || p.name || "");
    if (/\(CA\)\s*$/.test(n)) c = "CA";
    if (/\(US\)\s*$/.test(n)) c = "US";
  }
  if (c === "CANADA" || c === "CAN") c = "CA";
  if (c === "USA" || c === "UNITED STATES") c = "US";
  return c || "US";
}
function canonicalize(p) {
  // Extract lender name from product name if not available in database
  let lenderName = String(p.lender_name ?? p.lenderName ?? "");
  
  // If lender_name is empty, extract from product name
  if (!lenderName) {
    const productName = String(p.name ?? p.productName ?? "");
    const match = productName.match(/^([^-]+)/);
    lenderName = match ? match[1].trim() : "Unknown Lender";
  }

  return {
    id: String(p.id ?? ""),
    name: String(p.name ?? p.productName ?? ""),
    lender_id: String(p.lender_id ?? p.lenderId ?? lenderName),
    lender_name: lenderName,
    country: normalizeCountry(p),
    category: pickCategory(p),
    min_amount: Number(p.min_amount ?? p.minimumLendingAmount ?? 0),
    max_amount: Number(p.max_amount ?? p.maximumLendingAmount ?? Number.MAX_SAFE_INTEGER),
    interest_rate_min: p.interest_rate_min ?? p.interestRateMinimum ?? null,
    interest_rate_max: p.interest_rate_max ?? p.interestRateMaximum ?? null,
    term_min: p.term_min ?? p.termMinimum ?? null,
    term_max: p.term_max ?? p.termMaximum ?? null,
    active: (p.active ?? p.isActive) !== false,
    required_documents: [
      { key: "bank_6m", label: "Last 6 months bank statements", required: true, months: 6 },
      ...(Array.isArray(p.required_documents) ? p.required_documents : []),
    ],
  };
}
// Import database connection
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function loadRawProducts(req) {
  if (req.app?.locals?.catalog?.products) return req.app.locals.catalog.products;
  
  // Get products directly from database to avoid circular dependency
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id,
        p.product_name as name,
        p.lender_id,
        l.name AS lender_name,
        UPPER(p.country::text) AS country,
        p.category::text AS category,
        COALESCE(p.amount_min, 0) AS min_amount,
        COALESCE(p.amount_max, 0) AS max_amount,
        p.min_interest AS interest_rate_min,
        p.max_interest AS interest_rate_max,
        p.min_term_months AS term_min,
        p.max_term_months AS term_max,
        COALESCE(p.is_active, true) AS active,
        p.required_documents as required_documents
      FROM lender_products p
      LEFT JOIN lenders l ON l.id = p.lender_id
      ORDER BY l.name, p.product_name
    `);
    return rows;
  } catch (e) {
    console.error("Database query failed:", e);
    return [];
  }
}
router.get("/api/catalog/export-products", async (req, res) => {
  try {
    const raw = await loadRawProducts(req);
    const products = raw.map(canonicalize);

    const country = String(req.query.country || "").toUpperCase();
    const includeInactive = req.query.includeInactive === "1" || req.query.includeInactive === "true";
    const amount = Number(req.query.amount || 0);
    const lenderId = String(req.query.lenderId || "");

    const filtered = products.filter(p => {
      if (!includeInactive && !p.active) return false;
      if (country && p.country !== country) return false;
      if (amount && !(p.min_amount <= amount && amount <= p.max_amount)) return false;
      if (lenderId && p.lender_id !== lenderId) return false;
      return true;
    });

    res.json({
      total: filtered.length,
      products: filtered,
      canonical_fields: [
        "id","name","lender_id","lender_name","country","category",
        "min_amount","max_amount","interest_rate_min","interest_rate_max",
        "term_min","term_max","active","required_documents"
      ],
      source: "canonical-export@server"
    });
  } catch (e) {
    res.status(500).json({ error: "export_failed", message: String(e?.message || e) });
  }
});
export default router;