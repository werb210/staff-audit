// Standardized Authentication Utility
// This ensures ALL JWT generation uses consistent userId field structure
// Required for RBAC middleware compatibility
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required for authentication');
}
// Ensure JWT_SECRET is non-null for TypeScript
const JWT_SECRET_SAFE = JWT_SECRET;
/**
 * Generate a standardized JWT token with userId field
 * This is the ONLY function that should be used for JWT generation
 */
export function generateStandardToken(user, expiresIn = '8h') {
    const payload = {
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
    });
}
/**
 * Verify a standardized JWT token
 */
export function verifyStandardToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET_SAFE);
        // Ensure the token has the required fields and cast to our type
        if (!decoded.userId && !decoded.id) {
            throw new Error('Token missing required userId field');
        }
        const standardPayload = {
            userId: decoded.userId || decoded.id,
            email: decoded.email,
            role: decoded.role,
            tenantId: decoded.tenantId || decoded.tenant_id,
            iat: decoded.iat,
            exp: decoded.exp
        };
        return standardPayload;
    }
    catch (error) {
        throw new Error(`Invalid token: ${error?.message || 'Unknown error'}`);
    }
}
/**
 * Generate a standardized authentication response
 */
export function generateStandardAuthResponse(user, expiresIn = '8h', message = 'Login successful') {
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
    const opts = {
        httpOnly: true,
        secure: isProd, // must be true on HTTPS
        path: '/',
        sameSite: crossSite ? 'none' : 'lax',
    };
    if (crossSite && process.env.COOKIE_DOMAIN)
        opts.domain = process.env.COOKIE_DOMAIN;
    return opts;
}
console.log('✅ [STANDARD-AUTH] Standardized authentication utility loaded');
