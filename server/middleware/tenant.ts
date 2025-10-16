import { Request, Response, NextFunction } from 'express';
import { resolveTenantFromHeaders, TenantId } from '../tenancy/tenantMap';

export interface TenantRequest extends Request {
  tenant?: string;
  user?: any;
}

// Tenant detection middleware
export function detectTenant(req: TenantRequest, res: Response, next: NextFunction) {
  // Start with host-based tenant resolution (hardened)
  let tenant: TenantId = resolveTenantFromHeaders(req.headers);
  
  // Allow tenant switching via query params (for admin/testing)
  if (req.query.tenant && ['bf', 'slf'].includes(req.query.tenant as string)) {
    tenant = req.query.tenant as TenantId;
  }
  
  // Check session/cookie for tenant preference (overrides host)
  if (req.session?.tenant && ['bf', 'slf'].includes(req.session.tenant)) {
    tenant = req.session.tenant as TenantId;
  }
  
  // Store in both formats for compatibility
  req.tenant = tenant;
  (req as any).tenantId = tenant;
  
  next();
}

// Multi-tenant query helper
export function withTenant(baseQuery: any, tenant: string, unified = false) {
  if (unified) return baseQuery; // Skip tenant filter for unified views
  return { ...baseQuery, tenant_id: tenant };
}

// Tenant brand configuration
export const TENANT_CONFIG = {
  bf: {
    name: 'Boreal Financial',
    color: '#1f4f82',
    twilioNumber: '(825) 451-1768',
    twilioNumberE164: '+18254511768'
  },
  slf: {
    name: 'Site Level Financial', 
    color: '#16a34a',
    twilioNumber: '(775) 314-6801',
    twilioNumberE164: '+17753146801'
  }
};

export function getTenantConfig(tenant: string) {
  return TENANT_CONFIG[tenant as keyof typeof TENANT_CONFIG] || TENANT_CONFIG.bf;
}

// Database Integration Pack - Additional Middleware

// Middleware to enforce tenant scoping on queries
export function scopeByTenant(req: TenantRequest, res: Response, next: NextFunction) {
  // STAFF APP FIX: Bypass tenant requirement for client API calls
  const authHeader = req.headers["authorization"] || "";
  const clientToken = authHeader.replace("Bearer ", "").trim();
  
  const clientApiTokens = [
    "bf_client_live_32products_2025",
    "bf_client_sync_webhook_2025",
    process.env.CLIENT_API_KEY,
    process.env.CLIENT_SYNC_KEY
  ].filter(Boolean);
  
  if (clientApiTokens.includes(clientToken)) {
    console.log(`🔓 [TENANT-BYPASS] Client API bypassing tenant requirement for: ${req.path}`);
    req.tenant = 'bf'; // Default tenant for client API calls
    return next();
  }

  const tenant = req.tenant;
  
  if (!tenant) {
    return res.status(400).json({ 
      ok: false, 
      error: "tenant_required",
      message: "Tenant must be specified (bf or slf)"
    });
  }
  
  if (!["bf", "slf"].includes(tenant)) {
    return res.status(400).json({
      ok: false,
      error: "invalid_tenant", 
      message: "Tenant must be 'bf' or 'slf'"
    });
  }
  
  // Add tenant filter to query params if not already present
  if (req.query.where) {
    try {
      const where = JSON.parse(String(req.query.where));
      if (!where.tenant) {
        where.tenant = tenant;
        req.query.where = JSON.stringify(where);
      }
    } catch (e) {
      // If parsing fails, create new where clause
      req.query.where = JSON.stringify({ tenant });
    }
  } else {
    req.query.where = JSON.stringify({ tenant });
  }
  
  next();
}

// Middleware to enforce tenant isolation on mutations
export function enforceTenantMutation(req: TenantRequest, res: Response, next: NextFunction) {
  // STAFF APP FIX: Bypass tenant requirement for client API calls
  const authHeader = req.headers["authorization"] || "";
  const clientToken = authHeader.replace("Bearer ", "").trim();
  
  const clientApiTokens = [
    "bf_client_live_32products_2025",
    "bf_client_sync_webhook_2025",
    process.env.CLIENT_API_KEY,
    process.env.CLIENT_SYNC_KEY
  ].filter(Boolean);
  
  if (clientApiTokens.includes(clientToken)) {
    console.log(`🔓 [TENANT-MUTATION-BYPASS] Client API bypassing tenant requirement for: ${req.path}`);
    req.tenant = 'bf'; // Default tenant for client API calls
    return next();
  }

  const tenant = req.tenant;
  
  if (!tenant) {
    return res.status(400).json({ 
      ok: false, 
      error: "tenant_required"
    });
  }
  
  // Ensure tenant is set in request body for creation/updates
  if (req.body && typeof req.body === 'object') {
    req.body.tenant = tenant;
  }
  
  next();
}

// Helper function to get tenant filter for Prisma queries
export function getTenantFilter(req: TenantRequest): { tenant: string } | {} {
  const tenant = req.tenant;
  return tenant ? { tenant } : {};
}

// Validate tenant access for specific resources
export function validateTenantAccess(req: TenantRequest, res: Response, next: NextFunction) {
  const tenant = req.tenant;
  const resourceTenant = req.body?.tenant || req.params?.tenant;
  
  if (resourceTenant && resourceTenant !== tenant) {
    return res.status(403).json({
      ok: false,
      error: "tenant_mismatch",
      message: "Cannot access resource from different tenant"
    });
  }
  
  next();
}