import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { pool, assertDbReady } from "../db/pool";
const r = Router();

const TABLES = ["users","lenders","lender_products","contacts","applications"];

async function countOf(t:string){
  try {
    const q = await db.execute(sql.raw(`select count(*)::int as n from ${t}`));
    return { table: t, ok: true, count: q.rows?.[0]?.n ?? 0 };
  } catch (e:any) {
    return { table: t, ok: false, error: e.message };
  }
}

async function tryFixPermissions(tables:string[]){
  // Best-effort only: show GRANTs needed (we can't know DB role names safely)
  return tables.map(t => `-- If you see "permission denied", run (as DB owner):
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${t} TO CURRENT_ROLE;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO CURRENT_ROLE;`).join("\n");
}

async function runMigrationsIfPresent(){
  // If you keep .sql migrations in server/db/migrations, apply any file not recorded in drizzle schema table.
  // (Runtime-safe: we only run SQL files if the drizzle meta table exists and shows missing entries)
  try {
    await db.execute(sql`create table if not exists _migrations (name text primary key, applied_at timestamptz default now())`);
  } catch {}
  return "Use your existing migration runner (drizzle-kit) to apply pending migrations in CI/CD. Runtime execution is intentionally not automatic.";
}

r.get("/ops/db/self-test", async (_req,res)=>{
  const report:any = { env: {}, connectivity: {}, search_path: {}, tables: [], rls: {}, advice: [] };
  // ENV
  report.env.has_DATABASE_URL = !!process.env.DATABASE_URL;
  report.env.ssl_hint = /\bsslmode=require\b/i.test(process.env.DATABASE_URL||"") || process.env.PGSSLMODE==="require" || process.env.DATABASE_SSL==="true";

  // Connectivity
  try { await assertDbReady(); report.connectivity.ok = true; }
  catch(e:any){ report.connectivity.ok=false; report.connectivity.error=e.message; return res.json(report); }

  // search_path
  try {
    const sp = await db.execute(sql`show search_path`);
    report.search_path.value = sp.rows?.[0]?.search_path || "";
  } catch(e:any){ report.search_path.error = e.message; }

  // Table counts
  report.tables = await Promise.all(TABLES.map(countOf));

  // RLS detection
  try {
    const rls = await db.execute(sql`
      select t.relname as table, pol.polname as policy
      from pg_class t join pg_namespace n on n.oid=t.relnamespace
      left join pg_policy pol on pol.polrelid=t.oid
      where n.nspname='public' and t.relkind='r' and t.relname = any(${TABLES})
    `);
    report.rls.has_policies = (rls.rows||[]).some(r=>r.policy);
    report.rls.details = rls.rows;
  } catch {}

  // Advice
  for (const t of report.tables){
    if (!t.ok && /does not exist/i.test(t.error||"")) report.advice.push(`Table missing: ${t.table} — run migrations.`);
    if (!t.ok && /permission denied/i.test(t.error||"")) report.advice.push(`Permissions issue on ${t.table} — GRANT privileges to your app role.`);
  }
  if (!String(report.search_path.value||"").includes("public")) report.advice.push("search_path does not include 'public' — we force it per-connection, but set it at DB level for consistency.");

  res.json(report);
});

r.post("/ops/db/auto-fix", async (_req,res)=>{
  const results:any = {};
  // Force search_path now (already done on connect; repeat here)
  try { await pool.query("set search_path to public"); results.search_path="ok"; } catch(e:any){ results.search_path=e.message; }
  // Attempt a no-op migration hint
  results.migrations = await runMigrationsIfPresent();
  // Permission hints
  results.permission_hints = await tryFixPermissions(TABLES);
  res.json({ ok:true, results });
});

// Reseed core data if empty (idempotent)
r.post("/ops/db/reseed", async (_req,res)=>{
  const out:any = {};
  try {
    const u = await db.execute(sql`select count(*)::int as n from users`); 
    if (u.rows[0].n===0){
      await db.execute(sql`insert into users(first_name, last_name, email, role) values ('Admin', 'User', 'admin@system.local', 'admin')`);
      out.users="seeded";
    }
  } catch(e:any){ out.users=`skip (${e.message})`; }
  try {
    const l = await db.execute(sql`select count(*)::int as n from lenders`);
    if (l.rows[0].n===0){
      const lender = await db.execute(sql`insert into lenders(name,country) values('Acme Capital','CA') returning id`);
      const lid = lender.rows[0].id;
      await db.execute(sql`insert into lender_products(lender_id,category,min_amount,max_amount,country) values(${lid},'TermLoan',10000,250000,'CA')`);
      out.lenders="seeded";
    }
  } catch(e:any){ out.lenders=`skip (${e.message})`; }
  try {
    const c = await db.execute(sql`select count(*)::int as n from contacts`);
    if (c.rows[0].n===0){
      const contact = await db.execute(sql`insert into contacts(first_name, last_name, email, phone) values ('Test', 'Contact', 'test@example.com','+15555555555') returning id`);
      const cid = contact.rows[0].id;
      await db.execute(sql`insert into applications(contact_id, business_name, amount, stage, country, category, industry, months_in_business) values(${cid}, 'Test Application', 50000, 'new','CA','TermLoan','Services', 18)`);
      out.contacts="seeded";
    }
  } catch(e:any){ out.contacts=`skip (${e.message})`; }
  res.json({ ok:true, out });
});

// Quick counts for UI
r.get("/ops/db/counts", async (_req,res)=>{
  const r:any = {};
  for (const t of TABLES) {
    try { const q = await db.execute(sql.raw(`select count(*)::int as n from ${t}`)); r[t]=q.rows[0].n; } catch(e:any){ r[t]=`error: ${e.message}`; }
  }
  res.json({ ok:true, counts: r });
});

export default r;