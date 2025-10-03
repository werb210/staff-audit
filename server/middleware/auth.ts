import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Open routes that don't require authentication
const openRoutes = [
  "/api/client/lender-products",
  "/api/lender-products",
  "/api/lenders", 
  "/api/pipeline/cards",
  "/api/pipeline/board",
  "/api/contacts",
  "/api/users",
  "/api/client",
  "/api/health",
  "/api/v1/lenders",
  "/api/v1/products",
  "/api/v1/system",
  "/api/v1/dashboard",
  "/api/_int/build"
];

function readToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (h && /^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, "");
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  // PRODUCTION FIX: Check for client API bypass flag
  if ((req as any).skipAuth || (req as any).bypassAllAuth || req.path.startsWith('/api/client/')) {
    console.log(`🔓 [AUTH] Client API bypass for: ${req.path}`);
    return next();
  }
  
  // Check if route is open/public
  const isOpenRoute = openRoutes.some(route => req.path.startsWith(route));
  if (isOpenRoute) {
    console.log(`🔓 [AUTH] Open route accessed: ${req.path}`);
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log(`❌ [AUTH] Missing authorization header for: ${req.path}`);
    return res.status(401).json({ ok: false, error: "Missing bearer" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    console.log(`✅ [AUTH] Authenticated access: ${req.path}`);
    next();
  } catch (error) {
    console.log(`❌ [AUTH] Invalid token for: ${req.path}`);
    res.status(403).json({ ok: false, error: "Invalid token" });
  }
}

export function requireAuth(req: any, res: Response, next: NextFunction) {
  const tok = readToken(req);
  if (!tok) return res.status(401).json({ ok: false, error: "missing_token" });
  try {
    const p: any = jwt.verify(tok, JWT_SECRET);
    req.user = { id: p.sub || p.id, roles: p.roles || [] };
    next();
  } catch {
    res.status(401).json({ ok: false, error: "invalid_token" });
  }
}

export function signToken(user: { id: string; roles: string[] }) {
  return jwt.sign({ sub: user.id, roles: user.roles }, JWT_SECRET, { expiresIn: "7d" });
}

// Client sync authentication middleware
export function clientSyncAuth(req: any, res: any, next: any) {
  // STAFF APP FIX: Bypass lender-products endpoints - they have their own auth
  if (req.path.includes('/api/lender-products') || req.originalUrl.includes('/api/lender-products')) {
    console.log(`🔓 [CLIENT-SYNC-BYPASS] Bypassing clientSyncAuth for lender-products: ${req.path}`);
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: "Missing or invalid authorization header" 
    });
  }
  
  const key = authHeader.replace("Bearer ", "");
  if (key !== process.env.CLIENT_SYNC_KEY) {
    console.log(`🔒 [CLIENT-SYNC-AUTH] Invalid sync key attempted: ${key.substring(0, 10)}...`);
    return res.status(403).json({ 
      success: false, 
      error: "Unauthorized - Invalid sync key" 
    });
  }
  
  console.log(`✅ [CLIENT-SYNC-AUTH] Valid sync key authenticated`);
  next();
}