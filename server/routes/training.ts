import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";
const r = Router(); r.use(requireAuth);

r.post("/training/docs", async (req:any,res)=>{
  const { title, body } = req.body||{};
  const { rows } = await db.execute(sql`insert into training_docs(title, body, created_by, tsv) values(${title}, ${body}, ${req.user.sub}, to_tsvector('english', ${title}||' '||${body})) returning id,title,created_at`);
  res.json({ ok:true, item: rows[0] });
});

r.get("/training/search", async (req:any,res)=>{
  const q = String(req.query.q||"");
  if(!q) return res.json({ ok:true, items: [] });
  const { rows } = await db.execute(sql`
    select id, title, ts_headline('english', body, plainto_tsquery('english', ${q})) as snippet
    from training_docs
    where tsv @@ plainto_tsquery('english', ${q})
    order by ts_rank(tsv, plainto_tsquery('english', ${q})) desc
    limit 50
  `);
  res.json({ ok:true, items: rows });
});

export default r;