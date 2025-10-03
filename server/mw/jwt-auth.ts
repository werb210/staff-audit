import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ISS = process.env.JWT_ISS || "bf.staff";
const AUD = process.env.JWT_AUD || "bf.staff.web";

export type JwtUser = {
  sub: string;
  email: string;
  role: string;
  tenantId?: string;
};

export function signJwt(user: JwtUser) {
  return jwt.sign(user, SECRET, {
    issuer: ISS,
    audience: AUD,
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

export function verifyJwt(token: string): JwtUser {
  return jwt.verify(token, SECRET, { issuer: ISS, audience: AUD }) as JwtUser;
}

export function extractBearer(req: Request): string | null {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h || typeof h !== "string") return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// Attach req.user if token present & valid (does NOT fail the request)
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (token) {
    try { (req as any).user = verifyJwt(token); } catch { /* ignore */ }
  }
  next();
}

// Hard requirement for protected APIs
export function requireJwt(req: Request, res: Response, next: NextFunction) {
  // Allow public endpoints to bypass JWT authentication completely
  const PUBLIC_PATHS = [
    /^\/api\/public\//i,                // Any public API paths
    /^\/api\/applications/i,            // Direct application endpoints
    /^\/api\/health/i,                  // Health endpoints
    /^\/api\/v1\/lenders/i,             // Lender products API
    /^\/api\/v1\/products/i,            // Product listings
    /^\/api\/v1\/system/i,              // System endpoints
    /^\/api\/v1\/dashboard/i,           // Dashboard API
    /^\/api\/dashboard/i,               // Dashboard endpoints
    /^\/api\/documents/i,               // Document endpoints
    /^\/api\/objects/i,                 // Object storage endpoints
    /^\/api\/lenders/i,                 // Legacy lenders endpoints
    /^\/api\/voice\//i,                 // Twilio voice webhooks
    /^\/api\/auth\//i,                  // Auth endpoints
    /^\/api\/oauth\//i                  // OAuth endpoints
  ];

  // Check if path matches any public pattern
  if (PUBLIC_PATHS.some(pattern => pattern.test(req.path))) {
    console.log(`🔓 [JWT-BYPASS] Public path allowed: ${req.path}`);
    return next();
  }

  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "missing_bearer" });
  try {
    (req as any).user = verifyJwt(token);
    next();
  } catch (e: any) {
    return res.status(401).json({ error: "invalid_token" });
  }
}