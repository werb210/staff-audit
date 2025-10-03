import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

const SECRET = process.env.HASH_SECRET || "dev-secret";

export type Impersonation = { role: string; lenderId?: string; asUserId?: string; startedAt: number };

function sign(payload: string){ return crypto.createHmac("sha256", SECRET).update(payload).digest("hex"); }
export function setImpersonationCookie(res: Response, imp: Impersonation){
  const json = JSON.stringify(imp);
  const sig = sign(json);
  res.cookie("impersonate", Buffer.from(json).toString("base64") + "." + sig, {
    httpOnly: true, sameSite: "lax", secure: !!process.env.COOKIE_SECURE, path: "/",
    maxAge: 60 * 60 * 1000 // 1 hour
  });
}
export function clearImpersonationCookie(res: Response){
  res.clearCookie("impersonate", { path: "/" });
}
export function readImpersonationCookie(req: Request): Impersonation | null {
  const raw = (req as any).cookies?.impersonate;
  if (!raw) return null;
  const [b64, sig] = String(raw).split(".");
  if (!b64 || !sig) return null;
  const json = Buffer.from(b64, "base64").toString("utf8");
  if (sign(json) !== sig) return null; // tamper check
  try {
    const imp = JSON.parse(json);
    // expire after 1h
    if (Date.now() - (imp.startedAt || 0) > 60*60*1000) return null;
    return imp;
  } catch { return null; }
}

/** Middleware: attach effective role if impersonating */
export function applyImpersonation(req: Request, _res: Response, next: NextFunction){
  const user = (req as any).user;
  if (!user) return next();
  const imp = readImpersonationCookie(req);
  if (imp) {
    (req as any).auth = {
      real: { id: user.id, email: user.email, role: user.role },
      effective: { role: imp.role, lenderId: imp.lenderId, asUserId: imp.asUserId }
    };
    // Preserve original, but expose effective role to RBAC
    user.roleEffective = imp.role;
    if (imp.lenderId) user.lenderId = imp.lenderId;
  } else {
    (req as any).auth = { real: { id: user.id, email: user.email, role: user.role } };
    user.roleEffective = user.role;
  }
  next();
}