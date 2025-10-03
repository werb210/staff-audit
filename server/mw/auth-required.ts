// server/mw/auth-required.ts
import type { Request, Response, NextFunction } from "express";

export function isAuthed(req: Request): boolean {
  return Boolean((req as any).session?.user);
}

// Never protect auth endpoints or static login:
// /api/auth/* and GET /login must be reachable when logged out
export function shouldBypassAuth(req: Request): boolean {
  const u = req.originalUrl || req.url || "";
  if (u.startsWith("/api/auth/")) return true;
  if (req.method === "GET" && (u === "/login" || u.startsWith("/login?"))) return true;
  if (u === "/__version") return true;
  return false;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (shouldBypassAuth(req)) return next();
  if (isAuthed(req)) return next();
  const nextParam = encodeURIComponent(req.originalUrl || "/staff");
  return res.redirect(302, `/login?next=${nextParam}`);
}

export function requireAuthUnless(patterns: RegExp[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (patterns.some(rx => rx.test(req.path))) return next();
    return requireAuth(req, res, next);
  };
}

// For SPA HTML: redirect unauthenticated users to /login (but allow /login, /verify, /health)
export function htmlRequiresAuth(req: Request, res: Response, next: NextFunction) {
  const p = req.path.toLowerCase();
  if (p.startsWith("/login") || p.startsWith("/verify") || p === "/api/health") return next();
  if (isAuthed(req)) return next();
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
}