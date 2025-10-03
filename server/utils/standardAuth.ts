// Standardized Authentication Utility
// This ensures ALL JWT generation uses consistent userId field structure
// Required for RBAC middleware compatibility

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for authentication');
}

// Ensure JWT_SECRET is non-null for TypeScript
const JWT_SECRET_SAFE = JWT_SECRET as string;

export interface StandardTokenPayload {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  iat?: number;
  exp?: number;
}

export interface StandardUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
  firstName?: string;
  lastName?: string;
}

export interface StandardAuthResponse {
  ok: true;
  bearer: string;
  token: string; // Add token field for compatibility
  user: {
    id: string;
    role: string;
    email: string;
  };
}

/**
 * Generate a standardized JWT token with userId field
 * This is the ONLY function that should be used for JWT generation
 */
export function generateStandardToken(user: StandardUser, expiresIn = '8h'): string {
  const payload: StandardTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId
  };

  console.log(`🔑 [STANDARD-AUTH] Generating JWT for ${user.email} with userId field`);
  
  return jwt.sign(payload, JWT_SECRET_SAFE, { 
    expiresIn: expiresIn,
    issuer: 'staff-portal',
    audience: 'staff-portal-users'
  } as jwt.SignOptions);
}

/**
 * Verify a standardized JWT token
 */
export function verifyStandardToken(token: string): StandardTokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_SAFE) as any;
    
    // Ensure the token has the required fields and cast to our type
    if (!decoded.userId && !decoded.id) {
      throw new Error('Token missing required userId field');
    }
    
    const standardPayload: StandardTokenPayload = {
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId || decoded.tenant_id,
      iat: decoded.iat,
      exp: decoded.exp
    };
    
    return standardPayload;
  } catch (error: any) {
    throw new Error(`Invalid token: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate a standardized authentication response
 */
export function generateStandardAuthResponse(
  user: StandardUser, 
  expiresIn = '8h',
  message = 'Login successful'
): StandardAuthResponse {
  // Generate token directly using the standardized method
  const token = generateStandardToken(user, expiresIn);
  
  // Return user's exact standardized response format
  return {
    ok: true,
    bearer: token,
    token: token, // Add token field for compatibility
    user: {
      id: user.id,
      role: user.role,
      email: user.email
    }
  };
}

/**
 * Cookie options for secure authentication
 */
export function getStandardCookieOptions() {
  // Use user's exact cookie specification
  const isProd = process.env.NODE_ENV === 'production';
  const ui = process.env.UI_ORIGIN || '';
  const api = process.env.API_ORIGIN || '';
  const crossSite = ui && api && !ui.startsWith(api);

  const opts: any = {
    httpOnly: true,
    secure: isProd,  // must be true on HTTPS
    path: '/',
    sameSite: crossSite ? 'none' : 'lax',
  };
  if (crossSite && process.env.COOKIE_DOMAIN) opts.domain = process.env.COOKIE_DOMAIN;
  return opts;
}

console.log('✅ [STANDARD-AUTH] Standardized authentication utility loaded');