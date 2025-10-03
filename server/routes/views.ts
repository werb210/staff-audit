import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly.js";

const r = Router();
r.use(requireAuth);

r.get("/views", async (req: any, res) => {
  const scope = String(req.query.scope || "");
  const { rows } = await db.execute(sql`select * from saved_views where scope=${scope} and (user_id is null or user_id=${req.user.sub}) order by is_default desc, created_at desc`);
  res.json({ ok: true, items: rows });
});

r.post("/views", async (req: any, res) => {
  const { scope, name, query, is_default = false } = req.body || {};
  const { rows } = await db.execute(sql`insert into saved_views(user_id,scope,name,query,is_default) values(${req.user.sub},${scope},${name},${JSON.stringify(query)}::jsonb,${is_default}) returning *`);
  res.json({ ok: true, item: rows[0] });
});

r.put("/views/:id", async (req: any, res) => {
  const { name, query, is_default } = req.body || {};
  await db.execute(sql`update saved_views set name=coalesce(${name},name), query=coalesce(${JSON.stringify(query)}::jsonb,query), is_default=coalesce(${is_default},is_default) where id=${req.params.id}`);
  res.json({ ok: true });
});

export default r;