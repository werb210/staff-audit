import { Router } from "express";
import pkg from "pg";
const { Pool } = pkg;
const r = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
/**
 * GET /api/v1/lenders/products
 * Query: country?, category?, lender?, q?
 */
r.get("/products", async (req, res) => {
    const { country, category, lender, q } = req.query;
    const params = [];
    const where = [];
    // Use actual schema columns
    if (country && country !== "All") {
        params.push(country);
        where.push(`country::text ILIKE '%' || $${params.length} || '%'`);
    }
    if (category && category !== "All") {
        params.push(category);
        where.push(`category::text ILIKE '%' || $${params.length} || '%'`);
    }
    if (lender && lender !== "All") {
        params.push(lender);
        where.push(`lender_name ILIKE '%' || $${params.length} || '%'`);
    }
    if (q) {
        params.push(q);
        where.push(`(
      name ILIKE '%' || $${params.length} || '%' OR
      category::text ILIKE '%' || $${params.length} || '%' OR
      lender_name ILIKE '%' || $${params.length} || '%'
    )`);
    }
    const sql = `
    SELECT id, name, category::text as category, country::text as country,
           lender_name, description, is_active,
           interest_rate_min, interest_rate_max, rate_type,
           term_min, term_max
    FROM lender_products
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY lender_name, category, name
    LIMIT 1000
  `;
    try {
        const { rows } = await pool.query(sql, params);
        res.json(rows);
    }
    catch (error) {
        console.error("Products query failed:", error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: "Failed to fetch products" });
    }
});
/**
 * GET /api/v1/lenders
 * Filters: country?, category?, q?
 */
r.get("/", async (req, res) => {
    const { country, category, q } = req.query;
    const params = [];
    const where = [];
    if (country && country !== "All") {
        params.push(country);
        where.push(`lp.country::text ILIKE '%' || $${params.length} || '%'`);
    }
    if (category && category !== "All") {
        params.push(category);
        where.push(`lp.category::text ILIKE '%' || $${params.length} || '%'`);
    }
    if (q) {
        params.push(q);
        where.push(`l.company_name ILIKE '%' || $${params.length} || '%'`);
    }
    const sql = `
    SELECT l.id, l.company_name as name, l.tenant, l.is_active,
           COUNT(lp.id)::int AS product_count
    FROM lenders l
    LEFT JOIN lender_products lp ON lp.lender_name = l.company_name
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    GROUP BY l.id, l.company_name, l.tenant, l.is_active
    ORDER BY l.company_name
  `;
    try {
        const { rows } = await pool.query(sql, params);
        res.json(rows);
    }
    catch (error) {
        console.error("Lenders query failed:", error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: "Failed to fetch lenders" });
    }
});
/**
 * GET /api/v1/lenders/meta
 * Provide dropdown data for UI
 */
r.get("/meta", async (_req, res) => {
    try {
        const [countries, categories, lenders] = await Promise.all([
            pool.query(`SELECT DISTINCT country::text AS v FROM lender_products ORDER BY 1`),
            pool.query(`SELECT DISTINCT category::text AS v FROM lender_products ORDER BY 1`),
            pool.query(`SELECT company_name AS v FROM lenders ORDER BY 1`)
        ]);
        res.json({
            countries: ["All", ...countries.rows.map(r => r.v)],
            categories: ["All", ...categories.rows.map(r => r.v)],
            lenders: ["All", ...lenders.rows.map(r => r.v)]
        });
    }
    catch (error) {
        console.error("Meta query failed:", error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: "Failed to fetch metadata" });
    }
});
export default r;
