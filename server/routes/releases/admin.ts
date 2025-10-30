import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { Jobs } from "../../services/releases/jobs";
import { ctxFromReq, isFlagEnabled } from "../../services/flags/eval";

const router = Router();

/* ----- Admin: list/create/update ----- */
router.get("/", async (_req,res)=>{
  const r = await db.execute(sql`SELECT * FROM releases ORDER BY createdAt DESC`);
  res.json(r.rows || []);
});

router.post("/", async (req:any,res)=>{
  const { version, codename=null, notes_md=null, rollout_flag_key=null } = req.body || {};
  if (!version) return res.status(400).json({ error:"version required" });
  const up = await db.execute(sql`
    INSERT INTO releases(version, codename, notes_md, rollout_flag_key)
    VALUES (${version}, ${codename}, ${notes_md}, ${rollout_flag_key})
    ON CONFLICT (version) DO UPDATE SET codename=EXCLUDED.codename, notes_md=EXCLUDED.notes_md, rollout_flag_key=EXCLUDED.rollout_flag_key, updatedAt=now()
    RETURNING *
  `);
  res.json({ ok:true, release: up.rows?.[0] });
});

/* ----- Transitions ----- */
router.post("/:id/stage", async (req,res)=>{
  await db.execute(sql`UPDATE releases SET status='staged', staged_at=now(), updatedAt=now() WHERE id=${req.params.id}`);
  res.json({ ok:true });
});
router.post("/:id/live", async (req,res)=>{
  // Make this release live, archive previous live
  const id = req.params.id;
  await db.execute(sql`BEGIN`);
  try {
    await db.execute(sql`UPDATE releases SET status='archived', archived_at=now() WHERE status='live'`);
    await db.execute(sql`UPDATE releases SET status='live', live_at=now(), updatedAt=now() WHERE id=${id}`);
    await db.execute(sql`COMMIT`);
  } catch(e){
    await db.execute(sql`ROLLBACK`);
    throw e;
  }
  res.json({ ok:true });
});
router.post("/:id/archive", async (req,res)=>{
  await db.execute(sql`UPDATE releases SET status='archived', archived_at=now(), updatedAt=now() WHERE id=${req.params.id}`);
  res.json({ ok:true });
});

/* ----- Tasks (whitelisted jobs) ----- */
router.get("/:id/tasks", async (req,res)=>{
  const r = await db.execute(sql`SELECT * FROM release_tasks WHERE release_id=${req.params.id} ORDER BY createdAt`);
  res.json(r.rows || []);
});
router.post("/:id/tasks", async (req,res)=>{
  const { job_key, name=null } = req.body || {};
  if (!job_key || !(job_key in Jobs)) return res.status(400).json({ error:"invalid job_key" });
  const ins = await db.execute(sql`
    INSERT INTO release_tasks(release_id, job_key, name) VALUES (${req.params.id}, ${job_key}, ${name})
    RETURNING *
  `);
  res.json({ ok:true, task: ins.rows?.[0] });
});
router.post("/tasks/:taskId/run", async (req,res)=>{
  const t = (await db.execute(sql`SELECT * FROM release_tasks WHERE id=${req.params.taskId} LIMIT 1`)).rows?.[0];
  if (!t) return res.status(404).json({ error:"task not found" });
  const fn = Jobs[t.job_key];
  if (!fn) return res.status(400).json({ error:"job not registered" });
  await db.execute(sql`UPDATE release_tasks SET status='running', run_at=now(), last_error=NULL WHERE id=${t.id}`);
  try {
    const out = await fn({ releaseId: t.release_id });
    await db.execute(sql`UPDATE release_tasks SET status='ok' WHERE id=${t.id}`);
    res.json({ ok:true, out });
  } catch(e:any){
    await db.execute(sql`UPDATE release_tasks SET status='error', last_error=${String(e?.message||e)} WHERE id=${t.id}`);
    res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
});

/* ----- What's New / Changelog ----- */
router.get("/whatsnew", async (req:any,res)=>{
  // most recent LIVE release; optionally gate by feature flag
  const r = await db.execute(sql`SELECT * FROM releases WHERE status='live' ORDER BY live_at DESC LIMIT 1`);
  const rel = r.rows?.[0];
  if (!rel) return res.json(null);

  if (rel.rollout_flag_key){
    try {
      const evaln = await isFlagEnabled(rel.rollout_flag_key, ctxFromReq(req));
      if (!evaln.value) return res.json(null);
    } catch {}
  }

  // Check user dismissal
  const uid = req.user?.id || null;
  if (uid){
    const d = await db.execute(sql`SELECT 1 FROM whats_new_dismissals WHERE user_id=${uid} AND release_id=${rel.id} LIMIT 1`);
    if (d.rows?.[0]) return res.json(null);
  }
  res.json({ id: rel.id, version: rel.version, codename: rel.codename, notes_md: rel.notes_md, live_at: rel.live_at });
});

router.post("/dismiss/:releaseId", async (req:any,res)=>{
  const uid = req.user?.id || null;
  if (!uid) return res.status(401).json({ error:"login required to dismiss" });
  await db.execute(sql`
    INSERT INTO whats_new_dismissals(user_id, release_id) VALUES (${uid}, ${req.params.releaseId})
    ON CONFLICT (user_id, release_id) DO NOTHING
  `);
  res.json({ ok:true });
});

/* Public JSON changelog (last 50 live/staged) */
router.get("/changelog", async (_req,res)=>{
  const r = await db.execute(sql`
    SELECT version, codename, left(coalesce(notes_md,''), 4000) AS notes_md, status, live_at, staged_at, archived_at
      FROM releases
     WHERE status IN ('live','staged')
     ORDER BY (CASE status WHEN 'live' THEN live_at ELSE staged_at END) DESC NULLS LAST
     LIMIT 50
  `);
  res.json(r.rows || []);
});

export default router;