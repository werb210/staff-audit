import type { Router, Request, Response } from "express";
import { Router as makeRouter } from "express";
import { Pool } from "pg";
import { requireAdminToken } from "../middleware/requireAdminToken";
import { requireLenderAuth } from "../middleware/requireLenderAuth";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export function lendersRouter(): Router {
  const r = makeRouter();

  // LIST (filters: active, country, q; pagination)
  r.get("/lenders", async (req: Request, res: Response) => {
    const { active, country, q, limit="100", offset="0" } = req.query as Record<string,string>;
    const where:string[] = []; const args:any[] = [];
    if (active === "true") { where.push("is_active = TRUE"); }
    if (active === "false") { where.push("is_active = FALSE"); }
    if (country) { args.push(country); where.push(`country = $${args.length}`); }
    if (q) { args.push(`%${q.toLowerCase()}%`); where.push(`(lower(name) LIKE $${args.length} OR lower(legal_name) LIKE $${args.length})`); }
    const w = where.length? `WHERE ${where.join(" AND ")}` : "";
    const lim = Math.min(Number(limit||100), 200); const off = Math.max(Number(offset||0), 0);
    const client = await pool.connect();
    try {
      const sql = `SELECT id, name, 
                          address as legal_name, 
                          slug, 
                          url as website, 
                          main_contact_email as contact_email, 
                          main_phone as contact_phone, 
                          'US' as country, 
                          is_active
                   FROM lenders ${w} ORDER BY name ASC LIMIT ${lim} OFFSET ${off}`;
      const { rows } = await client.query(sql, args);
      res.json(rows);
    } catch (e:any) { res.status(500).json({ ok:false, error: e?.message || String(e) }); }
    finally { client.release(); }
  });

  // READ
  r.get("/lenders/:lenderId", async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`SELECT id, name, 
                                                  address as legal_name, 
                                                  slug, 
                                                  url as website, 
                                                  main_contact_email as contact_email, 
                                                  main_phone as contact_phone, 
                                                  'US' as country, 
                                                  is_active
                                           FROM lenders WHERE id=$1`, [req.params.lenderId]);
      if (!rows[0]) return res.status(404).json({ ok:false, error:"not_found" });
      res.json(rows[0]);
    } catch (e:any) { res.status(500).json({ ok:false, error: e?.message || String(e) }); }
    finally { client.release(); }
  });

  // CREATE (admin)
  r.post("/lenders", requireAdminToken, async (req: Request, res: Response) => {
    const { id, name, legal_name, slug, website, contact_email, contact_phone, country, is_active=true } = req.body||{};
    if (!id || !name) return res.status(400).json({ ok:false, error:"id_and_name_required" });
    const client = await pool.connect();
    try {
      await client.query(`INSERT INTO lenders(id,name,legal_name,slug,website,contact_email,contact_phone,country,is_active)
                          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                          ON CONFLICT (id) DO NOTHING`, [id, name, legal_name, slug, website, contact_email, contact_phone, country, !!is_active]);
      res.status(201).json({ ok:true, id });
    } catch (e:any) { res.status(500).json({ ok:false, error: e?.message || String(e) }); }
    finally { client.release(); }
  });

  // UPDATE (admin) — PATCH semantics
  r.patch("/lenders/:lenderId", requireAdminToken, async (req: Request, res: Response) => {
    const fields = ["name","legal_name","slug","website","contact_email","contact_phone","country","is_active"];
    const set:string[]=[]; const args:any=[]; let i=1;
    for (const f of fields) if (f in (req.body||{})) { set.push(`${f} = $${i++}`); args.push(req.body[f]); }
    if (!set.length) return res.json({ ok:true, nochange:true });
    args.push(req.params.lenderId);
    const client = await pool.connect();
    try {
      const { rowCount } = await client.query(`UPDATE lenders SET ${set.join(", ")} WHERE id=$${i}`, args);
      if (!rowCount) return res.status(404).json({ ok:false, error:"not_found" });
      res.json({ ok:true });
    } catch (e:any) { res.status(500).json({ ok:false, error: e?.message || String(e) }); }
    finally { client.release(); }
  });

  // DELETE (admin) — soft delete
  r.delete("/lenders/:lenderId", requireAdminToken, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      await client.query(`UPDATE lenders SET is_active=FALSE WHERE id=$1`, [req.params.lenderId]);
      res.json({ ok:true, soft_deleted:true });
    } catch (e:any) { res.status(500).json({ ok:false, error: e?.message || String(e) }); }
    finally { client.release(); }
  });

  // LENDER SELF-SERVICE (portal) — limited fields
  r.put("/lenders/:lenderId/self", requireLenderAuth, async (req: Request, res: Response) => {
    const allowed = ["website","contact_email","contact_phone"]; // extend as needed
    const set:string[]=[]; const args:any=[]; let i=1;
    for (const f of allowed) if (f in (req.body||{})) { set.push(`${f} = $${i++}`); args.push(req.body[f]); }
    if (!set.length) return res.json({ ok:true, nochange:true });
    args.push(req.params.lenderId);
    const client = await pool.connect();
    try {
      const { rowCount } = await client.query(`UPDATE lenders SET ${set.join(", ")} WHERE id=$${i}`, args);
      if (!rowCount) return res.status(404).json({ ok:false, error:"not_found" });
      res.json({ ok:true });
    } catch (e:any) { res.status(500).json({ ok:false, error: e?.message || String(e) }); }
    finally { client.release(); }
  });

  return r;
}