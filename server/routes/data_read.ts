import { Router } from 'express';
import { getDB } from '../lib/db';
const r = Router();
async function list(sql: string) {
  const db = getDB(); if (!db) return { ok:false, rows:[] as any[] };
  try { const rs = await db.query(sql); return { ok:true, rows: rs.rows||[] }; } catch { return { ok:false, rows:[] as any[] }; }
}
r.get('/data/users',         async (_q,res)=> res.json(await list('select * from users order by created_at desc nulls last limit 200')));
r.get('/data/lenders',       async (_q,res)=> res.json(await list('select * from lenders order by name asc')));
r.get('/data/lender-products',async (_q,res)=> res.json(await list('select * from lender_products order by name asc')));
r.get('/data/contacts',      async (_q,res)=> res.json(await list('select * from contacts order by created_at desc nulls last limit 200')));
export default r;