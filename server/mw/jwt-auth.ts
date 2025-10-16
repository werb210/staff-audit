// Canonical JWT helpers used across the server.
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type JwtUser = { id: string; email?: string; role?: string; [k: string]: any };
type SignOpts = { expiresIn?: string | number; audience?: string; issuer?: string };

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev-secret";
const JWT_AUD = process.env.JWT_AUDIENCE;
const JWT_ISS = process.env.JWT_ISSUER;

// Extract Bearer token from header or common cookies
function getToken(req: Request): string | undefined {
  const h = req.get("authorization") || req.get("Authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7).trim();
  const c = (req as any).cookies || {};
  return c.token || c.Authorization || c.authorization;
}

// Verify and return claims
function verifyToken(token: string): JwtUser {
  const opts: jwt.VerifyOptions = {};
  if (JWT_AUD) opts.audience = JWT_AUD;
  if (JWT_ISS) opts.issuer = JWT_ISS;
  return jwt.verify(token, JWT_SECRET, opts) as JwtUser;
}

// Attach if present (no 401 on failure)
export function attachUserIfPresent(req: Request & { user?: JwtUser }, _res: Response, next: NextFunction) {
  try {
    const t = getToken(req);
    if (!t) return next();
    req.user = verifyToken(t);
  } catch {
    // ignore invalid token
  }
  next();
}

// Require a valid JWT
export function requireJwt(req: Request & { user?: JwtUser }, res: Response, next: NextFunction) {
  try {
    const t = getToken(req);
    if (!t) return res.status(401).json({ ok: false, error: "missing_token" });
    req.user = verifyToken(t);
    next();
  } catch (e: any) {
    res.status(401).json({ ok: false, error: "invalid_token", detail: e?.message });
  }
}

// Sign helper
export function signJwt(payload: JwtUser, opts: SignOpts = {}) {
  const { expiresIn = "7d", audience = JWT_AUD, issuer = JWT_ISS } = opts;
  return jwt.sign(payload, JWT_SECRET, { expiresIn, audience, issuer });
}

// Optionally set cookie + header
export function setAuthCookie(res: Response, token: string) {
  res.setHeader("Authorization", `Bearer ${token}`);
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export default { attachUserIfPresent, requireJwt, signJwt, setAuthCookie };
