import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export function makeDupGuard({ table, cols }) {
  return async function(req,res,next){
    try{
      const vals = cols.map(c => String(req.body?.[c] ?? ""));
      if (vals.some(v => v==="")) return res.status(400).json({ error:"Missing fields", fields: cols });
      const where = cols.map((c,i)=>`lower(trim(${c}))=lower(trim($${i+1}))`).join(" AND ");
      const q = `SELECT 1 FROM ${table} WHERE ${where} LIMIT 1`;
      const { rows } = await pool.query(q, vals);
      if (rows.length) return res.status(409).json({ error:"Duplicate", table, cols, vals });
      next();
    }catch(e){ res.status(500).json({ error:"dupGuard failed", detail:String(e.message||e) }); }
  };
}