// =======================================================
// Boreal Financial Staff Server — DB Client (client.ts)
// =======================================================

import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.PGSSLMODE === "require"
      ? { rejectUnauthorized: false }
      : undefined,
  max: 10,
});

export default pool;
