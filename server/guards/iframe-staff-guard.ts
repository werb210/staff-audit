import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../mw/auth-required.js";

const PROTECTED = [/\/staff(?:\/|$)/, /\/\.replit\.dev\/staff(?:\/|$)/];

export function iframeStaffGuard(req: Request, res: Response, next: NextFunction) {
  const url = req.originalUrl || req.url || "";
  if (PROTECTED.some(rx => rx.test(url))) {
    return requireAuth(req, res, next);
  }
  return next();
}