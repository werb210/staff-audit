import { Router } from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = Router();

// List recent coverage stats
r.get("/coverage", async (req: any, res: any) => {
  const limit = Number(req.query.limit ?? 50);
  const { rows } = await pool.query(`
    SELECT id, business_name, fields_coverage, last_mapped_at, 
           array_length(fields_unmapped, 1) as unmapped_count
      FROM applications
     WHERE fields_coverage IS NOT NULL
     ORDER BY last_mapped_at DESC NULLS LAST
     LIMIT $1
  `, [limit]);
  res.json({ ok: true, data: rows });
});

// Single app coverage + unmapped
r.get("/coverage/:id", async (req: any, res: any) => {
  const { id } = req.params;
  const { rows } = await pool.query(`
    SELECT id, business_name, fields_raw, fields_canonical, 
           fields_unmapped, fields_coverage, last_mapped_at
      FROM applications WHERE id = $1
  `, [id]);
  
  if (rows.length === 0) {
    return res.status(404).json({ error: "Application not found" });
  }
  
  res.json({ ok: true, data: rows[0] });
});

// Global coverage stats
r.get("/stats", async (req: any, res: any) => {
  const { rows } = await pool.query(`
    SELECT 
      COUNT(*) as total_applications,
      COUNT(fields_coverage) as mapped_applications,
      ROUND(AVG(fields_coverage), 2) as avg_coverage,
      MAX(fields_coverage) as max_coverage,
      MIN(fields_coverage) as min_coverage
    FROM applications
  `);
  
  res.json({ ok: true, stats: rows[0] });
});

export default r;