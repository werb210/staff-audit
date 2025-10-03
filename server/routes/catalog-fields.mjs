import express from "express";

// OPTIONAL auth—public read access is OK. If you don't have this helper, inline a no-op.
let optionalAuth = (_req, _res, next) => next();
try {
  // If present in your codebase, use the real optional auth:
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  optionalAuth = require("../auth/optional-auth.mjs").optionalAuth ?? optionalAuth;
} catch {}

const router = express.Router();

// ---- Canonical field list (source-of-truth) ----
const CANONICAL_FIELDS = [
  {name:"id",type:"string",required:true},
  {name:"name",type:"string",required:true},
  {name:"lender_id",type:"string",required:true},
  {name:"lender_name",type:"string",required:true},
  {name:"country",type:"string",required:true,enum:["CA","US"]},
  {name:"category",type:"string",required:true},
  {name:"min_amount",type:"number",required:true},
  {name:"max_amount",type:"number",required:true},
  {name:"interest_rate_min",type:"number",required:false},
  {name:"interest_rate_max",type:"number",required:false},
  {name:"term_min",type:"number",required:false},
  {name:"term_max",type:"number",required:false},
  {name:"active",type:"boolean",required:true},
  {name:"required_documents",type:"array",item:"{key,label,required,months?}",required:true}
];

// ---- Legacy → Canonical alias map (what the CLIENT should normalize) ----
const LEGACY_ALIASES = {
  productName: "name",
  lenderName: "lender_name",
  countryOffered: "country",
  productCategory: "category",
  minimumLendingAmount: "min_amount",
  maximumLendingAmount: "max_amount",
  isActive: "active"
};

// GET /api/catalog/fields  → canonical schema + alias guidance
router.get("/api/catalog/fields", (_req, res) => {
  res.json({
    canonical_fields: CANONICAL_FIELDS,
    legacy_aliases: LEGACY_ALIASES,
    sample_endpoint: "/api/catalog/sample"
  });
});

// GET /api/catalog/sample → one normalized record (best-effort; works if DB/view exists)
router.get("/api/catalog/sample", optionalAuth, async (_req, res) => {
  // Try to query via pg if available
  let pg = null;
  try { pg = require("pg"); } catch { /* no pg */ }

  if (!pg) {
    return res.json({
      sample: null,
      ask: "pg not available here; this endpoint is optional. Use /api/catalog/export-products for full data."
    });
  }

  try {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    // Prefer the canonical view; fallback if needed.
    const sql = `
      WITH base AS (
        SELECT
          c.id,
          c.name,
          c.lender_id,
          l.name AS lender_name,
          c.country::text AS country,
          c.category::text AS category,
          c.min_amount,
          c.max_amount,
          c.interest_rate_min,
          c.interest_rate_max,
          c.term_min,
          c.term_max,
          c.active
        FROM crm_lender_products_canon c
        LEFT JOIN lenders l ON l.id = c.lender_id
      )
      SELECT * FROM base LIMIT 1;
    `;
    const { rows } = await pool.query(sql);
    const row = rows?.[0] ?? null;

    // Normalize + attach universal doc minimum (6 months bank statements)
    const sample = row && {
      ...row,
      required_documents: [
        { key: "bank_6m", label: "Last 6 months bank statements", required: true }
      ]
    };

    res.json({ sample });
  } catch (e) {
    res.json({
      sample: null,
      ask: "Create view crm_lender_products_canon or ensure export-products emits the canonical fields.",
      error_hint: e?.message
    });
  }
});

export default router;