import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";

const r = Router();
r.use(requireAuth);

// CRUD sequences
r.get("/marketing/sequences", async (_req, res) => { 
  const { rows } = await db.execute(sql`select * from marketing_sequences order by createdAt desc`); 
  res.json({ ok: true, items: rows }); 
});

r.post("/marketing/sequences", async (req: any, res: any) => { 
  const { name } = req.body || {}; 
  const { rows } = await db.execute(sql`insert into marketing_sequences(name) values(${name}) returning *`); 
  res.json({ ok: true, item: rows[0] }); 
});

r.put("/marketing/sequences/:id/steps", async (req: any, res: any) => { 
  const steps = req.body?.steps || []; 
  await db.execute(sql`delete from marketing_steps where sequence_id=${req.params.id}`); 
  for (let i = 0; i < steps.length; i++) { 
    await db.execute(sql`insert into marketing_steps(sequence_id,idx,kind,config) values(${req.params.id},${i},${steps[i].kind},${JSON.stringify(steps[i].config || {})})`); 
  } 
  res.json({ ok: true }); 
});

r.get("/marketing/sequences/:id/steps", async (req: any, res: any) => { 
  const { rows } = await db.execute(sql`select * from marketing_steps where sequence_id=${req.params.id} order by idx`); 
  res.json({ ok: true, items: rows }); 
});

// Enroll contacts
r.post("/marketing/sequences/:id/enroll", async (req: any, res: any) => {
  const { contactIds = [] } = req.body || {};
  const enrolled = [];
  for (const cid of contactIds) {
    const { rows } = await db.execute(sql`insert into marketing_enrollments(sequence_id, contact_id, status, next_run_at) values(${req.params.id}, ${cid}, 'active', now()) returning id`);
    enrolled.push(rows[0]);
  }
  res.json({ ok: true, enrolled: enrolled.length });
});

// Get enrollment status
r.get("/marketing/sequences/:id/enrollments", async (req: any, res: any) => {
  const { rows } = await db.execute(sql`
    select e.*, c.full_name, c.email 
    from marketing_enrollments e 
    left join contacts c on e.contact_id = c.id 
    where e.sequence_id = ${req.params.id} 
    order by e.createdAt desc
  `);
  res.json({ ok: true, items: rows });
});

// Audiences CRUD
r.get("/marketing/audiences", async (_req, res) => {
  const { rows } = await db.execute(sql`select * from audiences order by createdAt desc`);
  res.json({ ok: true, items: rows });
});

r.post("/marketing/audiences", async (req: any, res: any) => {
  const { name, filter } = req.body || {};
  const { rows } = await db.execute(sql`insert into audiences(name, filter) values(${name}, ${JSON.stringify(filter || {})}) returning *`);
  res.json({ ok: true, item: rows[0] });
});

// A/B Experiments
r.get("/marketing/experiments", async (_req, res) => {
  const { rows } = await db.execute(sql`select * from experiments order by createdAt desc`);
  res.json({ ok: true, items: rows });
});

r.post("/marketing/experiments", async (req: any, res: any) => {
  const { name, a_url, b_url } = req.body || {};
  const { rows } = await db.execute(sql`insert into experiments(name, a_url, b_url) values(${name}, ${a_url}, ${b_url}) returning *`);
  res.json({ ok: true, item: rows[0] });
});

// Short links for tracking
r.post("/marketing/short-links", async (req: any, res: any) => {
  const { url, experiment_id, variant } = req.body || {};
  const code = Math.random().toString(36).substr(2, 8);
  const { rows } = await db.execute(sql`insert into short_links(code, url, experiment_id, variant) values(${code}, ${url}, ${experiment_id || null}, ${variant || null}) returning *`);
  res.json({ ok: true, item: rows[0], shortUrl: `${req.protocol}://${req.headers.host}/t/${code}` });
});

r.get("/marketing/short-links/:code/stats", async (req: any, res: any) => {
  const { rows } = await db.execute(sql`select * from short_links where code=${req.params.code}`);
  res.json({ ok: true, item: rows[0] });
});

export default r;