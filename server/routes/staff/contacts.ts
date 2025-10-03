import { Router, Request, Response } from "express";
import { pool } from "../../db";

const r = Router();

/**
 * GET /api/staff/contacts?tenant=BF&query=ava
 * Minimal contact cards used by the Staff UI (left list + details).
 * Read-only. Adjust column names if your schema differs.
 */
r.get("/contacts", async (req: Request, res: Response) => {
  const q = String(req.query.query || "").trim();
  // reserved for future: const tenant = String(req.query.tenant || "BF");

  const params: any[] = [];
  let where = "1=1";
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (
      LOWER(u.first_name||' '||u.last_name) LIKE LOWER($${params.length})
      OR LOWER(u.email) LIKE LOWER($${params.length})
      OR u.phone LIKE $${params.length}
    )`;
  }

  const sql = `
    SELECT
      u.id,
      u.first_name AS "firstName",
      u.last_name  AS "lastName",
      u.email,
      u.phone,
      COALESCE((
        SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id
      ),0)::int AS "applicationsCount",
      'BF ONLY'::text AS "tenant"
    FROM users u
    WHERE ${where}
    ORDER BY u.updated_at DESC NULLS LAST, u.id DESC
    LIMIT 100
  `;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

export default r;