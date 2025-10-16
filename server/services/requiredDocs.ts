import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type DocRow = { key:string; name:string; description?:string|null; default_required?:boolean|null; category?:string|null; allowed_mime?:string[]|null; min_count?:number|null; max_count?:number|null; meta?:any };

export async function aggregateRequiredDocs(opts: { productId?:string; lenderId?:string }) {
  const client = await pool.connect();
  try {
    const { productId, lenderId } = opts;

    const [master, prod, lender] = await Promise.all([
      client.query<DocRow>(`SELECT key,name,description,default_required,category,allowed_mime,min_count,max_count,meta
                             FROM required_docs_master`),
      productId ? client.query(`SELECT prd.doc_key AS key, m.name, m.description, prd.required, m.category, m.allowed_mime, m.min_count, m.max_count, m.meta
                                FROM product_required_docs prd
                                JOIN required_docs_master m ON m.key=prd.doc_key
                                WHERE prd.product_id=$1`, [productId]) : Promise.resolve({ rows: [] } as any),
      lenderId ? client.query(`SELECT lrd.doc_key AS key, m.name, m.description, lrd.required, m.category, m.allowed_mime, m.min_count, m.max_count, m.meta
                               FROM lender_required_docs lrd
                               JOIN required_docs_master m ON m.key=lrd.doc_key
                               WHERE lrd.lender_id=$1`, [lenderId]) : Promise.resolve({ rows: [] } as any),
    ]);

    // Priority: product override > lender override > master default
    const map = new Map<string, any>();
    for (const r of master.rows) {
      map.set(r.key, { key:r.key, name:r.name, description:r.description, required: !!r.default_required,
                       category:r.category||null, allowed_mime:r.allowed_mime||null,
                       min_count:r.min_count??1, max_count:r.max_count??null, meta:r.meta||null, source:"master" });
    }
    for (const r of lender.rows) {
      const prev = map.get(r.key) || { key:r.key, name:r.name };
      map.set(r.key, { ...prev, required: !!(r as any).required, source:"lender" });
    }
    for (const r of prod.rows) {
      const prev = map.get(r.key) || { key:r.key, name:r.name };
      map.set(r.key, { ...prev, required: !!(r as any).required, source:"product" });
    }

    // Return only required docs (UI shows required; optional can be added in future flag)
    const out = [...map.values()].filter(d => d.required);
    // stable sort: product first, then lender, then master
    const weight = (s:string)=> s==="product"?0 : s==="lender"?1 : 2;
    out.sort((a,b)=> weight(a.source)-weight(b.source) || a.key.localeCompare(b.key));
    return out;
  } finally { client.release(); }
}