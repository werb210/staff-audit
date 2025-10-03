import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const CNAME = process.env.SESSION_COOKIE_NAME || "s_sid";
const IDLE = Math.max(5, Number(process.env.SESSION_IDLE_MIN||60));           // minutes
const ABS  = Math.max(IDLE, Number(process.env.SESSION_ABSOLUTE_MIN||720));   // minutes

export async function loadStaff(req:Request, _res:Response, next:NextFunction){
  const sid = (req as any).cookies?.[CNAME];
  if (!sid) return next();
  try {
    const r = await db.execute(sql`
      SELECT s.id, s.user_id, s.created_at, s.last_seen_at, s.expires_at, s.revoked_at,
             u.id as uid, u.email, u.name, u.role
      FROM staff_sessions s
      JOIN staff_users u ON u.id = s.user_id
      WHERE s.id=${sid}
      LIMIT 1`);
    const row:any = r.rows?.[0];
    if (!row || row.revoked_at) return next();

    const now = new Date();
    const idleExpired = now.getTime() - new Date(row.last_seen_at).getTime() > IDLE*60*1000;
    const absExpired  = now.getTime() - new Date(row.created_at).getTime() > ABS*60*1000;
    const hardExpired = now > new Date(row.expires_at);
    if (idleExpired || absExpired || hardExpired){
      await db.execute(sql`UPDATE staff_sessions SET revoked_at=now() WHERE id=${row.id}`);
      return next();
    }
    // Touch last_seen every 60s to reduce churn
    if (now.getTime() - new Date(row.last_seen_at).getTime() > 60*1000){
      await db.execute(sql`UPDATE staff_sessions SET last_seen_at=now() WHERE id=${row.id}`);
    }
    (req as any).user = { id: row.uid, email: row.email, name: row.name, role: row.role };
    (req as any).sessionId = row.id;
  } catch {}
  next();
}

export function requireStaff(req:Request,res:Response,next:NextFunction){
  if (!(req as any).user?.id) return res.status(401).json({ error:"unauthorized" }); next();
}
export function requireAdmin(req:Request,res:Response,next:NextFunction){
  const role = (req as any).user?.role; if (role==="admin") return next(); return res.status(403).json({ error:"forbidden" });
}
export function getIP(req:Request){ return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || (req.socket as any).remoteAddress || null; }