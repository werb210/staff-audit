import fs from "fs";
import path from "path";
import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
const { Pool } = pkg;

type FileShape = { lenders?: Array<{ name:string; products: any[] }>; allProducts?: any[]; };

const norm = (s:string)=>s.trim().replace(/\s+/g," ");

async function main() {
  const jsonPath = process.argv[2] || "lenders_products.json";
  const json: FileShape = JSON.parse(fs.readFileSync(path.resolve(jsonPath), "utf8"));

  const products = Array.isArray(json.allProducts) && json.allProducts.length
    ? json.allProducts
    : (json.lenders??[]).flatMap(l=>l.products||[]);

  const jsonCounts = new Map<string, number>();
  for (const p of products) {
    const k = norm(p.lender_name);
    jsonCounts.set(k, (jsonCounts.get(k)||0)+1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const { rows } = await db.execute<{ lender:string; c:number }>(sql`
    SELECT l.company_name as lender, COUNT(*)::int c
    FROM lender_products lp
    JOIN lenders l ON l.id = lp.lender_id
    GROUP BY l.company_name
    ORDER BY l.company_name
  `);
  await pool.end();

  const dbCounts = new Map(rows.map(r=>[norm(r.lender), r.c]));
  const allNames = Array.from(new Set([...jsonCounts.keys(), ...dbCounts.keys()])).sort();

  const lines = [
    "# Lenders & Products — JSON vs Staff DB",
    "",
    "| Lender | JSON Products | DB Products | Match |",
    "|---|---:|---:|:--:|"
  ];
  for (const name of allNames) {
    const j = jsonCounts.get(name) ?? 0;
    const d = dbCounts.get(name) ?? 0;
    lines.push(`| ${name} | ${j} | ${d} | ${j===d ? "✅" : "❌"} |`);
  }
  const out = "reports/LENDERS_SIDE_BY_SIDE.md";
  fs.mkdirSync("reports", { recursive: true });
  fs.writeFileSync(out, lines.join("\n"));
  console.log(`Wrote ${out}`);
}
main().catch(e=>{ console.error(e); process.exit(1); });