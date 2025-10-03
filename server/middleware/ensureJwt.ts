import { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../auth/jwt";

export function ensureJwt(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const claims = verifyAccess(token);
    (req as any).user = claims; // attach for routes
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}