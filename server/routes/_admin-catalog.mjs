import express from "express";
import { Pool } from "pg";
const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.post("/api/_admin/normalize-countries", async (_req, res) => {
  try {
    await pool.query("BEGIN");
    // re-run the same SQL as migration step 1 (safe idempotent)
    await pool.query(`
      UPDATE lender_products lp
         SET country = UPPER(regexp_replace(lp.name, '^.*\\((CA|US)\\)\\s*$', '\\1'))::lender_country
       WHERE (lp.country IS NULL OR trim(lp.country::text) = '')
         AND lp.name ~ '\\((CA|US)\\)\\s*$';
      UPDATE lender_products
         SET country = CASE WHEN UPPER(country::text) IN ('CA','US') THEN UPPER(country::text)::lender_country ELSE NULL END
       WHERE country IS NOT NULL;
    `);
    await pool.query("COMMIT");
    const result = await pool.query(`SELECT country, COUNT(*) n FROM crm_lender_products_canon GROUP BY country ORDER BY country`);
    res.json({ ok:true, by_country: result.rows });
  } catch (e) {
    await pool.query("ROLLBACK");
    res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
});

router.post("/api/_admin/push-products", async (_req, res) => {
  try {
    const clientBase = process.env.CLIENT_BASE;
    const token = process.env.SYNC_TOKEN;
    if (!clientBase || !token) return res.status(400).json({ ok:false, error:"missing CLIENT_BASE or SYNC_TOKEN" });

    const r = await fetch("http://localhost:5000/api/v1/products");
    const v1 = await r.json();

    const resp = await fetch(`${clientBase}/api/sync/lender-products`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ products: v1, source: "staff-v1" })
    });
    const j = await resp.json().catch(()=>({}));
    res.json({ ok: resp.ok, status: resp.status, client_response: j });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
});

export default router;