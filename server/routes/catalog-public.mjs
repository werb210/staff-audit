import express from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const catalogPublicRouter = express.Router();

catalogPublicRouter.use((req,res,next)=>{
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
  next();
});

catalogPublicRouter.get("/export-products", async (req,res)=>{
  const { country, amount, includeInactive } = req.query;
  const params = [];
  let where = "1=1";
  if (country) { params.push(String(country).toUpperCase()); where += ` AND c.country = $${params.length}`; }
  if (amount)  { params.push(Number(amount));               where += ` AND c.min_amount <= $${params.length}`; 
                 params.push(Number(amount));               where += ` AND c.max_amount >= $${params.length}`; }
  if (!includeInactive) where += " AND c.active = TRUE";
  
  const q = `SELECT c.id, 
                    c.name, 
                    c.lender_id,
                    l.name AS lender_name,
                    c.country::text AS country, 
                    c.category::text AS category, 
                    c.min_amount, 
                    c.max_amount, 
                    c.active
             FROM crm_lender_products_canon c
             LEFT JOIN lenders l ON l.id = c.lender_id
             WHERE ${where} 
             ORDER BY l.name NULLS LAST, c.name`;
  const { rows } = await pool.query(q, params);
  
  // include stable + legacy keys (no defaults here)
  const products = rows.map((r) => ({
    id: r.id,
    name: r.name,
    lenderId: r.lender_id,
    lenderName: r.lender_name,
    country: r.country,                 // "US" | "CA"
    category: r.category,               // canonical
    productCategory: r.category,        // legacy alias for older clients
    minAmount: r.min_amount,
    maxAmount: r.max_amount,
    active: !!r.active,
  }));
  
  res.json({ total: products.length, products });
});

catalogPublicRouter.get("/country-counts", async (_req,res)=>{
  const { rows } = await pool.query(
    `SELECT country, COUNT(*)::int AS total
     FROM crm_lender_products_canon WHERE active = TRUE GROUP BY country ORDER BY country`
  );
  res.json(rows);
});

catalogPublicRouter.get("/categories", async (req,res)=>{
  const amount = Number(req.query.amount ?? 0);
  const country = String(req.query.country ?? "").toUpperCase();
  const params = [country, amount, amount];
  const { rows } = await pool.query(
    `SELECT DISTINCT category
     FROM crm_lender_products_canon
     WHERE country = $1 AND active = TRUE AND min_amount <= $2 AND max_amount >= $3
     ORDER BY category`, params
  );
  res.json({ categories: rows.map(r=>r.category).filter(Boolean) });
});

catalogPublicRouter.get("/sanity", async (_req,res)=>{
  const meta = {};
  const cc = await pool.query(
    `SELECT country, COUNT(*)::int AS total FROM crm_lender_products_canon GROUP BY country ORDER BY country`
  );
  meta.countryCounts = cc.rows;
  const cat = await pool.query(
    `SELECT category, COUNT(*)::int AS total FROM crm_lender_products_canon GROUP BY category ORDER BY category`
  );
  meta.categoryCounts = cat.rows;
  res.json({ ok: true, meta });
});