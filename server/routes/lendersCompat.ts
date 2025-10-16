import { Router } from "express";
import { pool } from "../db/drizzle";

type Tenant = "bf"|"slf";
const tenantOf = (req:any):Tenant => (String(req.headers["x-tenant"]||"bf").toLowerCase()==="slf" ? "slf":"bf");

async function pickTable(cands: string[]){
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])`,
    [cands]
  );
  for (const c of cands) if (rows.find(r => r.table_name === c)) return c;
  return null;
}

function asNum(x:any){ if(x==null||x==="")return null; const n=Number(x); return isFinite(n)?n:null; }
function asBool(x:any, def=true){ if(x==null||x==="") return def; const s=String(x).toLowerCase(); return ["1","true","yes","y"].includes(s); }
function s(x:any){ return (x??"").toString().trim(); }

const r = Router();

// DISABLED: Conflicting with canonical /api/lenders - this returns products not lenders
/*
r.get("/lenders", async (req,res)=>{
  const tenant = tenantOf(req);
  const Product = await pickTable(["LenderProduct","lender_products"]);
  const Lender  = await pickTable(["Lender","lenders"]);
  if(!Product||!Lender) return res.status(500).json({ok:false,error:"tables_missing"});

  const page  = Math.max(1, Number(req.query.page)||1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit)||50));
  const offset= (page-1)*limit;

  const lenderName = s(req.query.lender_name).toLowerCase();
  const productType= s(req.query.product_type).toLowerCase();
  const isActive   = asBool(req.query.is_active, true);
  const minAmount  = asNum(req.query.min_amount);
  const maxAmount  = asNum(req.query.max_amount);

  const where:string[] = [`1=1`]; // Skip tenant filtering for now since we have UUID/string mismatch
  const params:any[] = []; let i=params.length;

  if (isActive) where.push(`(p.is_active IS NULL OR p.is_active = true)`);
  if (lenderName){ params.push(`%${lenderName}%`); i++; where.push(`(lower(coalesce(l.company_name,l.contact_name)) LIKE $${i})`); }
  if (productType){ params.push(productType); i++; where.push(`(lower(p.category::text)=$${i} OR lower(p.name) LIKE '%'||$${i}||'%')`); }
  if (minAmount!=null){ params.push(minAmount); i++; where.push(`(p.amount_min IS NULL OR p.amount_min>=$${i})`); }
  if (maxAmount!=null){ params.push(maxAmount); i++; where.push(`(p.amount_max IS NULL OR p.amount_max<=$${i})`); }

  const whereSQL = where.length? `WHERE ${where.join(" AND ")}` : "";

  const countSQL = `SELECT COUNT(*)::int n FROM "${Product}" p LEFT JOIN "${Lender}" l ON l.id=p.lender_id ${whereSQL}`;
  const listSQL  = `
    SELECT p.id, p.lender_id, coalesce(l.company_name,l.contact_name) AS lender_name,
           p.name, p.description, p.is_active::text AS status, p.category,
           p.term_max AS term_months, p.amount_min AS min_amount, p.amount_max AS max_amount,
           p.created_at, p.updated_at
    FROM "${Product}" p
    LEFT JOIN "${Lender}" l ON l.id=p.lender_id
    ${whereSQL}
    ORDER BY coalesce(l.company_name,l.contact_name), p.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{rows:[{n:total=0}={n:0}]}, {rows:products}] = await Promise.all([
    pool.query(countSQL, params),
    pool.query(listSQL, params),
  ]);

  res.json(products);
});
*/

// DISABLED: GET /api/lenders/:id  (one product, client shape)
/*
r.get("/lenders/:id", async (req,res)=>{
  const tenant = tenantOf(req);
  const Product = await pickTable(["LenderProduct","lender_products"]);
  const Lender  = await pickTable(["Lender","lenders"]);
  const { id }  = req.params;

  const sql = `
    SELECT p.*, coalesce(l.company_name,l.contact_name) AS lender_name
    FROM "${Product}" p
    LEFT JOIN "${Lender}" l ON l.id=p.lender_id
    WHERE p.id=$1 LIMIT 1
  `;
  const { rows } = await pool.query(sql, [id]);
  if(!rows.length) return res.status(404).json({ ok:false, error:"not_found" });

  const r0 = rows[0];
  if(r0.amount_min!=null) r0.min_amount = Number(r0.amount_min);
  if(r0.amount_max!=null) r0.max_amount = Number(r0.amount_max);
  if(r0.term_max!=null) r0.term_months = Number(r0.term_max);

  res.json(r0);
});

// GET /api/lenders/categories/summary
r.get("/lenders/categories/summary", async (req,res)=>{
  const tenant = tenantOf(req);
  const Product = await pickTable(["LenderProduct","lender_products"]);
  const sql = `
    SELECT CASE WHEN p.category IS NULL THEN 'term_loan' ELSE lower(p.category::text) END AS category,
           COUNT(*)::int AS count,
           MIN(p.amount_min) AS min_amount,
           MAX(p.amount_max) AS max_amount,
           AVG(NULLIF(p.term_max,0))::int AS avg_term_months
    FROM "${Product}" p
    WHERE 1=1
    GROUP BY 1
    ORDER BY 2 DESC
  `;
  const { rows } = await pool.query(sql, []);
  res.json({ categories: rows });
});

// GET /api/lenders/required-documents/:category
r.get("/lenders/required-documents/:category", async (req,res)=>{
  const tenant = tenantOf(req);
  const Product = await pickTable(["LenderProduct","lender_products"]);
  const category = String(req.params.category||"").toLowerCase();

  const sql = `
    SELECT p.doc_requirements AS docs
    FROM "${Product}" p
    WHERE 1=1 AND lower(coalesce(p.category::text,''))=$1
      AND p.doc_requirements IS NOT NULL
    LIMIT 100
  `;
  const { rows } = await pool.query(sql, [category]);
  const merged:any[] = [];
  for (const r of rows) {
    try {
      const list = Array.isArray(r.docs) ? r.docs : JSON.parse(r.docs || "[]");
      merged.push(...list);
    } catch {}
  }
  res.json({ items: merged });
});
*/

export default r;