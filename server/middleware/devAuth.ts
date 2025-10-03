import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type Role = "admin"|"manager"|"agent"|"lender"|"referrer"|"marketing";

export function devAuth(req: Request, _res: Response, next: NextFunction) {
  if (process.env.DEV_AUTH !== "1") return next();

  // Base dev user if none exists yet
  let user: any = (req as any).user ?? {
    id: "dev-user",
    email: "staff@boreal.financial",
    role: "admin",
    dev: true
  };

  // Accept bearer/jwt if present (helps local API tests)
  const bearer = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookieTok = (req as any).cookies?.staff_token;
  const token = bearer || cookieTok;
  if (token) {
    try {
      const payload = jwt.decode(token) as any;
      user = {
        id: payload?.sub ?? user.id,
        email: payload?.email ?? user.email,
        role: (payload?.role as Role) ?? user.role,
        dev: true
      };
    } catch {/* ignore */}
  }

  // DEV override: cookie with impersonation payload
  const imp = (req as any).cookies?.dev_impersonate;
  if (imp) {
    try {
      const data = JSON.parse(imp); // { role, email?, lenderId? }
      if (data?.role) user.role = data.role as Role;
      if (data?.email) user.email = data.email;
      if (data?.lenderId) user.lenderId = data.lenderId;
      user.dev = true;
    } catch {/* ignore */}
  }

  // Header override (useful for quick cURL): x-dev-role
  const hdrRole = req.get("x-dev-role");
  if (hdrRole) user.role = hdrRole as Role;

  (req as any).user = user;
  next();
}