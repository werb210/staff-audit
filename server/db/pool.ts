import { Pool, PoolConfig } from "pg";

function buildConfig(): PoolConfig {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  // SSL detection (Neon/Heroku/Render/Supabase etc.)
  const sslRequired = /\bsslmode=require\b/i.test(url) || process.env.PGSSLMODE === "require" || process.env.DATABASE_SSL === "true";
  const cfg: PoolConfig = { connectionString: url, max: Number(process.env.PGPOOL_MAX||"10") };
  if (sslRequired) cfg.ssl = { rejectUnauthorized: false };
  return cfg;
}

export const pool = new Pool(buildConfig());

// Ensure search_path = public (avoids invisible tables when DB default changed)
pool.on("connect", (client) => {
  client.query("set search_path to public").catch(()=>{});
});

// Lightweight readiness probe
export async function assertDbReady() {
  const c = await pool.connect();
  try {
    await c.query("select 1 as ok");
  } finally {
    c.release();
  }
}