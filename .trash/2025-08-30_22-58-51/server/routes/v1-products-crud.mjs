import express from "express";
import { Pool } from "pg";
import { z } from "zod";
import { ProductFormZ } from "../ui-schemas/product.zod.ts";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

function toV1(r) {
  const productName = r.name ?? "";
  const lenderName = extractLenderFromName(productName);
  
  return {
    id: r.id,
    productName: productName,
    lenderName: lenderName,
    countryOffered: (r.country ?? null),
    productCategory: r.category ?? null,
    minimumLendingAmount: r.min_amount ?? null,
    maximumLendingAmount: r.max_amount ?? null,
    isActive: r.active ?? true,
    min_time_in_business: r.min_time_in_business ?? null,
    min_monthly_revenue: r.min_monthly_revenue ?? null,
    required_documents: Array.isArray(r.required_documents) ? r.required_documents : [],
    excluded_industries: Array.isArray(r.excluded_industries) ? r.excluded_industries : [],
    geography: Array.isArray(r.geography) ? r.geography : []
  };
}

// Extract lender name from product name (e.g., "Accord - AccordAccess" -> "Accord")
function extractLenderFromName(productName) {
  console.log("Extracting from:", JSON.stringify(productName), "type:", typeof productName);
  if (!productName || typeof productName !== 'string') {
    console.log("Failed basic checks");
    return "";
  }
  
  // Simple first approach: split on " - " 
  if (productName.includes(" - ")) {
    const result = productName.split(" - ")[0].trim();
    console.log("Extracted:", JSON.stringify(result));
    return result;
  }
  
  console.log("No separator found, returning first word");
  return productName.split(" ")[0] || "";
}

// LIST ALL PRODUCTS - MISSING ENDPOINT
router.get("/api/v1/products", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200); // Cap at 200
    const offset = parseInt(req.query.offset) || 0;
    
    const { rows } = await pool.query(
      "SELECT * FROM crm_lender_products_canon ORDER BY id LIMIT $1 OFFSET $2", 
      [limit, offset]
    );
    
    return res.json(rows.map(toV1));
  } catch (e) {
    return res.status(500).json({ 
      success: false,
      error: "Failed to fetch products", 
      detail: String(e?.message||e) 
    });
  }
});

// READ (view)
router.get("/api/v1/products/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM crm_lender_products_canon WHERE id=$1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    return res.json(toV1(rows[0]));
  } catch (e) {
    return res.status(500).json({ error: "fetch failed", detail: String(e?.message||e) });
  }
});

// CREATE
router.post("/api/v1/products", express.json(), async (req, res) => {
  try {
    const body = ProductFormZ.parse(req.body);
    const q = `
      INSERT INTO lender_products
        (name, country, category, min_amount, max_amount, active,
         min_time_in_business, min_monthly_revenue, required_documents, excluded_industries)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`;
    const vals = [
      body.name, body.country, body.category,
      body.min_amount ?? null, body.max_amount ?? null,
      body.active,
      body.min_time_in_business ?? null, body.min_monthly_revenue ?? null,
      JSON.stringify(body.required_documents ?? []),
      (body.excluded_industries ?? []).length ? body.excluded_industries : null
    ];
    const { rows } = await pool.query(q, vals);
    return res.status(201).json(toV1(rows[0]));
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: "validation", issues: e.issues });
    return res.status(500).json({ error: "create failed", detail: String(e?.message||e) });
  }
});

// UPDATE
router.put("/api/v1/products/:id", express.json(), async (req, res) => {
  try {
    const body = ProductFormZ.partial().parse(req.body);
    const fields = [];
    const vals = [];
    const add = (col, val) => { fields.push(`${col}=$${fields.length+1}`); vals.push(val); };

    if (body.name !== undefined) add("name", body.name);
    if (body.country !== undefined) add("country", body.country);
    if (body.category !== undefined) add("category", body.category);
    if (body.min_amount !== undefined) add("min_amount", body.min_amount ?? null);
    if (body.max_amount !== undefined) add("max_amount", body.max_amount ?? null);
    if (body.active !== undefined) add("active", body.active);
    if (body.min_time_in_business !== undefined) add("min_time_in_business", body.min_time_in_business ?? null);
    if (body.min_monthly_revenue !== undefined) add("min_monthly_revenue", body.min_monthly_revenue ?? null);
    if (body.required_documents !== undefined) add("required_documents", JSON.stringify(body.required_documents ?? []));
    if (body.excluded_industries !== undefined) add("excluded_industries", (body.excluded_industries ?? null));

    if (!fields.length) return res.status(400).json({ error: "no fields to update" });

    const q = `UPDATE lender_products SET ${fields.join(", ")} WHERE id=$${fields.length+1} RETURNING *`;
    vals.push(req.params.id);

    const { rows } = await pool.query(q, vals);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    return res.json(toV1(rows[0]));
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: "validation", issues: e.issues });
    return res.status(500).json({ error: "update failed", detail: String(e?.message||e) });
  }
});

// DELETE
router.delete("/api/v1/products/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("DELETE FROM lender_products WHERE id=$1 RETURNING *", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (e) {
    return res.status(500).json({ error: "delete failed", detail: String(e?.message||e) });
  }
});

export default router;