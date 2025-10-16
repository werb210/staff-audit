import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Client } from "pg";

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/boreal",
  });
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);

  const dir = join(process.cwd(), "migrations");
  const files = readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
  for (const f of files) {
    const id = f;
    const done = await client.query(`SELECT 1 FROM _migrations WHERE id=$1`, [id]);
    if (done.rowCount) continue;
    const sql = readFileSync(join(dir, f), "utf8");
    console.log("→ applying", id);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(`INSERT INTO _migrations (id) VALUES ($1)`, [id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("✗ migration failed:", id, e);
      process.exit(1);
    }
  }
  await client.end();
  console.log("✓ migrations complete");
}

main().catch(e => { console.error(e); process.exit(1); });