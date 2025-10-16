import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function jwtOrSession(req: Request, _res: Response, next: NextFunction){
  // 🧪 API TEST MODE - Skip JWT checks for sync endpoints when API_MODE=test
  if (process.env.API_MODE === 'test' && req.path.includes('/lender-products/sync')) {
    console.log('🧪 [API-TEST-MODE] Bypassing JWT authentication for lender-products sync in test mode');
    (req as any).user = {
      id: 'test-user',
      email: 'test@staff.local',
      role: 'staff',
      tenantId: 'bf'
    };
    return next();
  }
  
  // Accept either Bearer token or auth cookie (supports __Host- prefix)
  const authz = req.headers.authorization || "";
  const bearer = authz.startsWith("Bearer ") ? authz.slice(7) : null;

  // Common cookie names
  const cookies: any = (req as any).cookies || {};
  const cookieToken =
    cookies["__Host-bf_auth"] || cookies["bf_auth"] ||
    cookies["__Host-auth"]    || cookies["auth"]    || null;

  const token = bearer || cookieToken;
  if (!token) return next();

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    // host/tenant reconciliation: host wins (set earlier by tenancyMiddleware)
    const hostTenant = (req as any).tenantId;
    const effectiveTenant = payload.tenantId || hostTenant || "bf";
    (req as any).user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: effectiveTenant
    };
  } catch {
    // ignore bad token; user stays undefined (will 401 on guarded routes)
  }
  next();
}