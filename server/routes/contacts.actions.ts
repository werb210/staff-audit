import type { Express, Request, Response } from "express";
import { Pool } from "pg";
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function maybe<T>(sql: string, args: any[]): Promise<T|null> {
  try { const { rows } = await db.query(sql, args); return rows[0]||null; } catch { return null; }
}

export function mountContactActions(app: Express) {
  // POST /api/contacts/:id/email  { subject, body }
  app.post("/api/contacts/:id/email", async (req: Request, res: Response) => {
    await maybe("insert into email_messages(contact_id, subject, body) values($1,$2,$3) returning id", [req.params.id, req.body.subject||"", req.body.body||""]);
    res.json({ ok: true });
  });

  // POST /api/contacts/:id/notes  { text }
  app.post("/api/contacts/:id/notes", async (req: any, res: any) => {
    await maybe("insert into notes(contact_id, text) values($1,$2) returning id", [req.params.id, req.body.text||""]);
    res.json({ ok: true });
  });

  // POST /api/contacts/:id/meetings  { startsAt, endsAt, title }
  app.post("/api/contacts/:id/meetings", async (req: any, res: any) => {
    await maybe("insert into meetings(contact_id, title, starts_at, ends_at) values($1,$2,$3,$4) returning id", [req.params.id, req.body.title||"Meeting", req.body.startsAt||new Date(), req.body.endsAt||new Date()]);
    res.json({ ok: true });
  });

  // POST /api/contacts/:id/files  { filename, size }
  app.post("/api/contacts/:id/files", async (req: any, res: any) => {
    await maybe("insert into contact_files(contact_id, name, size) values($1,$2,$3) returning id", [req.params.id, req.body.filename||"file", req.body.size||0]);
    res.json({ ok: true });
  });

  // POST /api/contacts/:id/create-application  { amount }
  app.post("/api/contacts/:id/create-application", async (req: any, res: any) => {
    const row = await maybe<{id:string}>(
      `insert into applications (contact_id, requested_amount, status, createdAt)
       values($1,$2,'draft',now()) returning id`,
      [req.params.id, req.body.amount || 0]
    );
    res.json({ ok: true, applicationId: row?.id });
  });
}