import { Client } from "pg";

async function main(){
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const t = process.argv.includes("--slf") ? "slf" : "bf";
  const now = new Date().toISOString();
  await client.query(`INSERT INTO users (id, tenant_id, email, name, role, active) VALUES
    ($1,$2,$3,$4,'admin',true)
    ON CONFLICT (id) DO NOTHING`, [`u-${t}-admin`, t, `admin@${t}.example`, `${t.toUpperCase()} Admin`]);
  await client.end();
  console.log("✓ seeded", t);
}

main().catch(e=>{ console.error(e); process.exit(1); });