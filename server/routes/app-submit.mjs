import express from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = express.Router();

/**
 * POST /api/applications
 * Body MUST include product_id and intake (same shape as validate)
 * We re-run validation, then insert with product_snapshot & docs.
 */
r.post("/applications", async (req, res) => {
  try {
    const intake = req.body||{};
    // call validator internally
    const { product_id } = intake;
    if (!product_id) return res.status(400).json({ ok:false, error:"product_id required" });

    const { rows } = await pool.query("SELECT * FROM crm_lender_products_canon WHERE id=$1", [product_id]);
    if (!rows.length) return res.status(404).json({ ok:false, error:"unknown product_id" });
    const p = rows[0];

    // lightweight rechecks (for speed); rely on validator on client/UI flow
    const docs = Array.isArray(p.required_documents) && p.required_documents.length
      ? p.required_documents
      : ["Last 6 months bank statements"];

    const ins = await pool.query(
      `INSERT INTO applications(product_id, submission_country, product_snapshot, required_documents)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [p.id, (p.country||null), p, docs]
    );
    return res.status(201).json({ ok:true, id: ins.rows[0].id });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e.message||e) });
  }
});
export default r;