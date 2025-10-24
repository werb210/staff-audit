// server/middleware/csp.ts
import type { Request, Response, NextFunction } from "express";
import { permissionsPolicy } from "../security/csp.js";

export function csp(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Permissions-Policy", permissionsPolicy);
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
}