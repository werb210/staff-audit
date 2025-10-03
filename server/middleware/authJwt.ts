import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtUser { id: string; role: string; email: string; }
declare module "express-serve-static-core" { interface Request { user?: JwtUser } }

export function authJwt(req: Request, res: Response, next: NextFunction) {
  // Check if auth bypass flag is set (for public routes)
  if ((req as any).skipAuth) {
    console.log(`🔓 [authJwt] Skipping auth check for: ${req.path}`);
    return next();
  }

  const h = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/.exec(h);
  if (!m) return res.status(401).json({ error: "missing_bearer" });

  try {
    const payload = jwt.verify(m[1], process.env.JWT_SECRET!) as JwtUser & { exp:number, iat:number };
    req.user = { id: payload.id, role: payload.role, email: payload.email };
    return next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_or_expired_token" });
  }
}