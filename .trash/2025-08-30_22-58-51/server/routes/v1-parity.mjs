import express from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

// GET /api/v1/products
router.get("/api/v1/products", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM crm_lender_products_canon ORDER BY name NULLS LAST");
    const out = rows.map(r => ({
      id: r.id,
      productName: r.name ?? "",
      lenderName: r.lender_name ?? "",        // optional
      countryOffered: (["CA","US"].includes((r.country||"").toUpperCase()) ? (r.country||"").toUpperCase() : null),
      productCategory: r.category ?? null,
      minimumLendingAmount: r.min_amount ?? null,
      maximumLendingAmount: r.max_amount ?? null,
      isActive: r.active ?? true,
      min_time_in_business: r.min_time_in_business ?? null,
      min_monthly_revenue: r.min_monthly_revenue ?? null,
      required_documents: Array.isArray(r.required_documents) ? r.required_documents : [],
      excluded_industries: Array.isArray(r.excluded_industries) ? r.excluded_industries : [],
    }));
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: "v1 products failed", detail: String(e?.message||e) });
  }
});

// DISABLED: Legacy V1 parity route - conflicts with new lenders-api.ts
// router.get("/api/lender-products", async (_req, res) => {
//   Moved to lenders-api.ts with proper database integration
// });

export default router;