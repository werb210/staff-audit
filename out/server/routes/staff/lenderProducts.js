import { Router } from "express";
import { pool } from "../../db";
const r = Router();
/**
 * GET /api/staff/lender-products
 * Simple product directory for the Staff UI card list.
 */
r.get("/lender-products", async (_req, res) => {
    const sql = `
    SELECT
      id,
      name,
      category,
      status,
      COALESCE(min_amount,0) AS min_amount,
      COALESCE(max_amount,0) AS max_amount
    FROM lender_products
    ORDER BY name ASC
  `;
    const { rows } = await pool.query(sql);
    res.json(rows);
});
export default r;
