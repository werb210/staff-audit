import { Router } from "express";
import { db } from "../../db/client";
import { sql } from "drizzle-orm";
import { hashPassword } from "../../services/auth/password";

const router = Router();
/** POST /api/bootstrap/seed  (Header: X-Bootstrap-Token)  Body: { email, password } */
router.post("/seed", async (req:any,res:any)=>{
  const token = String(req.get("X-Bootstrap-Token")||"");
  if (!process.env.ADMIN_BOOTSTRAP_TOKEN || token !== process.env.ADMIN_BOOTSTRAP_TOKEN) return res.status(403).json({ error:"forbidden" });

  const email = String(req.body?.email||"admin@example.com").toLowerCase().trim();
  const password = String(req.body?.password||"ChangeMe!2025");
  if(!email || !password) return res.status(400).json({ error:"email_and_password_required" });

  const t = await db.execute(sql`SELECT to_regclass('public.staff_users') su, to_regclass('public.users') u`);
  const tb = (!!t.rows?.[0]?.su) ? "staff_users" : ((!!t.rows?.[0]?.u) ? "users" : "staff_users");
  if (tb==="staff_users"){
    try{ await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);}catch{}
    await db.execute(sql`CREATE TABLE IF NOT EXISTS staff_users(
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      email text UNIQUE NOT NULL, role text NOT NULL DEFAULT 'admin',
      password_hash text NOT NULL, is_active boolean NOT NULL DEFAULT true,
      must_change_password boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now())`);
  }
  const hash = await hashPassword(password);
  await db.execute(sql`
    INSERT INTO ${sql.raw(tb)}(email, role, password_hash, is_active, must_change_password, created_at)
    VALUES (${email}, 'admin', ${hash}, true, false, now())
    ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='admin', is_active=true, must_change_password=false
  `);
  res.json({ ok:true, email, table: tb });
});
export default router;