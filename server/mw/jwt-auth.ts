// JWT helpers used by routes and boot wiring
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type JwtUser = { id: string; email?: string; role?: string; [k: string]: any };
type SignOpts = { expiresIn?: string | number; audience?: string; issuer?: string };

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev-secret";
const JWT_AUD = process.env.JWT_AUDIENCE;
const JWT_ISS = process.env.JWT_ISSUER;

// Extract Bearer token from header or cookie
function getToken(req: Request): string | undefined {
  const h = req.get("authorization") || req.get("Authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7).trim();
  // fallback cookies commonly used by frontends
  const c = (req as any).cookies || {};
  return c.token || c.Authorization || c.authorization;
}

// Verify token. Throws on failure.
function verifyToken(token: string): JwtUser {
  const opts: jwt.VerifyOptions = {};
  if (JWT_AUD) opts.audience = JWT_AUD;
  if (JWT_ISS) opts.issuer = JWT_ISS;
  const decoded = jwt.verify(token, JWT_SECRET, opts);
  // HS256 default unless RS config provided via key material
  return decoded as JwtUser;
}

// Middleware: attach user if token present (no 401 on failure)
export function attachUserIfPresent(req: Request & { user?: JwtUser }, _res: Response, next: NextFunction) {
  try {
    const token = getToken(req);
    if (!token) return next();
    req.user = verifyToken(token);
  } catch {
    // ignore invalid token here
  }
  next();
}

// Middleware: require a valid JWT
export function requireJwt(req: Request & { user?: JwtUser }, res: Response, next: NextFunction) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ ok: false, error: "missing_token" });
    req.user = verifyToken(token);
    return next();
  } catch (e: any) {
    return res.status(401).json({ ok: false, error: "invalid_token", detail: e?.message });
  }
}

// Sign a JWT for a user payload
export function signJwt(payload: JwtUser, opts: SignOpts = {}) {
  const { expiresIn = "7d", audience = JWT_AUD, issuer = JWT_ISS } = opts;
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn, audience, issuer });
  return token;
}

// Optional helper to set cookie alongside Authorization header
export function setAuthCookie(res: Response, token: string) {
  res.setHeader("Authorization", `Bearer ${token}`);
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export type { JwtUser };
export default { attachUserIfPresent, requireJwt, signJwt, setAuthCookie };
