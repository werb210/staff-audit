import type { Request, Response, NextFunction } from "express";

export function requireSharedToken(req: Request, res: Response, next: NextFunction) {
  // Only enforce when the shared-token mode is enabled.
  if (process.env.ALLOW_CLIENT_SHARED_TOKEN !== "1") return next();
  
  const expected = process.env.CLIENT_SHARED_BEARER;
  if (!expected) return res.status(401).json({ ok: false, error: "missing_server_token" });

  const auth = (req.headers["authorization"] || "") as string;
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return res.status(401).json({ ok: false, error: "missing_bearer" });

  const token = m[1].trim();
  if (token !== expected) return res.status(401).json({ ok: false, error: "invalid_bearer" });
  
  return next();
}