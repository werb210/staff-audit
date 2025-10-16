import type { Request, Response, NextFunction } from 'express';

/**
 * Optional shared token authentication middleware for client access
 * Only active when ALLOW_CLIENT_SHARED_TOKEN=1
 */
export function sharedTokenAuth(req: Request, res: Response, next: NextFunction) {
  const allowSharedToken = process.env.ALLOW_CLIENT_SHARED_TOKEN === '1';
  const sharedToken = process.env.CLIENT_SHARED_BEARER;
  
  if (!allowSharedToken) {
    return next(); // Skip shared token auth if disabled
  }
  
  if (!sharedToken) {
    console.warn('🚨 [SHARED-TOKEN] ALLOW_CLIENT_SHARED_TOKEN=1 but CLIENT_SHARED_BEARER not set');
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === sharedToken) {
      console.log(`✅ [SHARED-TOKEN] Valid shared token access from ${req.ip} to ${req.path}`);
      // Mark request as authenticated via shared token
      (req as any).sharedTokenAuth = true;
      return next();
    }
  }
  
  // Continue to next middleware (regular JWT auth will handle if needed)
  next();
}

/**
 * Check if request was authenticated via shared token
 */
export function isSharedTokenAuth(req: Request): boolean {
  return (req as any).sharedTokenAuth === true;
}