import express from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = express.Router();
r.get("/api/catalog/sanity", async (_req, res) => {
  try {
    const [countries,categories,ranges] = await Promise.all([
      pool.query(`SELECT COALESCE(country,'NULL') k, COUNT(*) n FROM crm_lender_products_canon GROUP BY 1 ORDER BY 2 DESC, 1`),
      pool.query(`SELECT COALESCE(category,'NULL') k, COUNT(*) n FROM crm_lender_products_canon GROUP BY 1 ORDER BY 2 DESC, 1`),
      pool.query(`SELECT MIN(min_amount) min_min, MAX(min_amount) max_min, MIN(max_amount) min_max, MAX(max_amount) max_max FROM crm_lender_products_canon`)
    ]);
    res.json({ total:countries.rows.reduce((a,r)=>a+Number(r.n||0),0),
      by_country:countries.rows, by_category:categories.rows, ranges:ranges.rows[0] });
  } catch(e){ res.status(500).json({ error:"sanity failed", detail:String(e.message||e) }); }
});
export default r;