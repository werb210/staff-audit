import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";

const router = Router();

router.post("/ingest", async (req:any, res)=>{
  const { name, value, rating, page, path } = req.body || {};
  const userId = req.user?.id || req.session?.user_id || null;
  const ua = String(req.headers["user-agent"] || "");
  if (!name) return res.status(400).json({ error:"name required" });
  await db.execute(sql`
    INSERT INTO perf_vitals(name, value, rating, page, path, user_id, ua)
    VALUES (${name}, ${value || null}, ${rating || null}, ${page || null}, ${path || null}, ${userId}, ${ua})
  `);
  res.json({ ok:true });
});

router.get("/latest", async (_req,res)=>{
  const r = await db.execute(sql`
    SELECT name, rating, round(COALESCE(value,0)::numeric, 2) as value, page, path, ua, created_at
    FROM perf_vitals
    ORDER BY created_at DESC
    LIMIT 200
  `);
  res.json(r.rows || []);
});

export default router;