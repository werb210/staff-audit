import express from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = express.Router();

// Import shared token middleware
import { requireSharedToken } from "../middleware/requireSharedToken.js";

/**
 * POST /api/applications/validate-intake (with shared token auth)
 * Body: { product_id, country, amount, timeInBusinessMonths, monthlyRevenue, industry }
 *   OR: { business, owners, amountRequested } (new schema)
 * Returns: { ok: boolean, errors?: string[], product?: object }
 */
r.post("/applications/validate-intake", requireSharedToken, async (req, res) => {
  try {
    const body = req.body || {};
    
    // Support both validation schemas for maximum compatibility
    // New schema: { business, owners, amountRequested }
    if (body.business || body.owners || body.amountRequested) {
      const required = ["business", "owners", "amountRequested"];
      const missing = required.filter(k => body[k] == null);
      
      if (missing.length) {
        return res.status(400).json({ 
          ok: false, 
          error: "missing_fields", 
          missing 
        });
      }
      
      return res.json({ 
        ok: true, 
        validated: true,
        schema: "new"
      });
    }
    
    // Original schema: { product_id, country, amount, ... }
    const { product_id, country, amount, timeInBusinessMonths, monthlyRevenue, industry } = body;
    const errs = [];
    if (!product_id) errs.push("product_id is required");
    if (!country) errs.push("country is required");
    if (amount == null) errs.push("amount is required");
    if (errs.length) return res.status(400).json({ ok:false, errors:errs });

    const { rows } = await pool.query(
      "SELECT * FROM crm_lender_products_canon WHERE id=$1",
      [product_id]
    );
    if (!rows.length) return res.status(404).json({ ok:false, errors:["unknown product_id"] });

    const p = rows[0];

    // Country must match when product has a declared country
    if (p.country && p.country !== String(country).toUpperCase()) {
      errs.push(`country mismatch: product=${p.country} vs intake=${country}`);
    }
    // Amount checks
    if (p.min_amount != null && Number(amount) < Number(p.min_amount)) {
      errs.push(`amount below minimum (${p.min_amount})`);
    }
    if (p.max_amount != null && Number(amount) > Number(p.max_amount)) {
      errs.push(`amount above maximum (${p.max_amount})`);
    }
    // TIB / Revenue
    if (p.min_time_in_business != null && Number(timeInBusinessMonths||0) < Number(p.min_time_in_business)) {
      errs.push(`time in business below minimum (${p.min_time_in_business} months)`);
    }
    if (p.min_monthly_revenue != null && Number(monthlyRevenue||0) < Number(p.min_monthly_revenue)) {
      errs.push(`monthly revenue below minimum (${p.min_monthly_revenue})`);
    }
    // Industry exclusion
    if (industry && Array.isArray(p.excluded_industries) && p.excluded_industries.includes(industry)) {
      errs.push(`industry '${industry}' is excluded`);
    }

    if (errs.length) return res.status(422).json({ ok:false, errors:errs, product:p });

    // Resolve documents (prefer Staff-provided)
    const docs = Array.isArray(p.required_documents) && p.required_documents.length
      ? p.required_documents
      : ["Last 6 months bank statements"]; // minimal baseline

    return res.json({ ok:true, product:p, required_documents:docs });
  } catch (e) {
    return res.status(500).json({ ok:false, errors:[String(e.message||e)] });
  }
});
export default r;