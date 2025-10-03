import { Pool } from "pg";
const db = new Pool({ connectionString: process.env.DATABASE_URL });

export async function findAppByAnyId(idOrExt: string) {
  const q = `
    WITH c AS (
      SELECT $1::text AS key,
             CASE WHEN $1 ~* '^[0-9a-f-]{36}$' THEN $1::uuid END AS uuid_key
    )
    SELECT a.*
    FROM c LEFT JOIN applications a
      ON a.id = c.uuid_key OR a.external_id = c.key
    WHERE a.id IS NOT NULL
    LIMIT 1;
  `;
  const { rows } = await db.query(q, [idOrExt]);
  return rows[0] || null;
}