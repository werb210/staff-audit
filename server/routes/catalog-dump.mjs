import express from "express";

const router = express.Router();

router.get("/api/catalog/dump", async (req,res)=>{
  try {
    const {limit=500} = req.query;
    // Use dynamic import to avoid circular dependency
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const { rows } = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.lender_id,
        l.name AS lender_name,
        UPPER(p.country::text) AS country,
        p.category::text AS category,
        COALESCE(p.min_amount, 0) AS min_amount,
        COALESCE(p.max_amount, 0) AS max_amount,
        NULL::numeric AS interest_rate_min,
        NULL::numeric AS interest_rate_max,
        NULL::integer AS term_min,
        NULL::integer AS term_max,
        COALESCE(p.active, true) AS active
      FROM crm_lender_products_canon p
      LEFT JOIN lenders l ON l.id = p.lender_id
      ORDER BY l.name, p.name
      LIMIT $1
    `, [Number(limit)]);

    const baseline = [{key:"bank_6m",label:"Last 6 months bank statements",required:true,months:6}];
    const products = rows.map(r => ({ ...r, required_documents: baseline }));
    
    res.json({
      canonical_fields: ["id","name","lender_id","lender_name","country","category","min_amount","max_amount","interest_rate_min","interest_rate_max","term_min","term_max","active","required_documents"],
      products: products
    });
  } catch(e) {
    res.status(500).json({ 
      error:"dump_not_available",
      canonical_fields: ["id","name","lender_id","lender_name","country","category","min_amount","max_amount","interest_rate_min","interest_rate_max","term_min","term_max","active","required_documents"],
      products: []
    });
  }
});

export default router;