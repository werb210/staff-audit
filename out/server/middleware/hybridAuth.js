import { CLIENT_APP_SHARED_TOKEN } from '../config';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required for authentication');
}
// Whitelisted public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
    // Public API endpoints for client portal integration
    { method: 'POST', path: /^\/api\/public\/applications$/ },
    { method: 'GET', path: /^\/api\/public\/applications\/[a-f0-9\-]{36}\/signing-status$/ },
    { method: 'GET', path: /^\/api\/public\/applications\/[a-f0-9\-]{36}\/required-docs$/ },
    { method: 'POST', path: /^\/api\/public\/applications\/[a-f0-9\-]{36}\/selected-category$/ },
    { method: 'GET', path: /^\/api\/public\/lenders$/ },
    { method: 'GET', path: /^\/api\/public\/lenders\/summary$/ },
    // CRITICAL FIX: Add upload endpoint to public whitelist
    { method: 'POST', path: /^\/api\/public\/upload\/[a-f0-9\-\w]+$/ },
    // Document access endpoints (restricted public access - require Bearer token or valid session)
    // Note: These endpoints will check for authentication in their route handlers
    // Debug endpoints (development only)
    ...(process.env.NODE_ENV === 'development' ? [
        { method: 'GET', path: /^\/api\/public\/applications\/debug\/applications\/[a-f0-9\-]{36}$/ }
    ] : []),
    // Webhook endpoints (external services)
    // SignNow removed
    // Health and monitoring endpoints
    { method: 'GET', path: /^\/$/ },
    { method: 'GET', path: /^\/api\/version$/ },
    { method: 'GET', path: /^\/health$/ },
    // IVR and Voice endpoints (for Twilio webhooks)
    { method: 'GET', path: /^\/api\/ivr\/voice\/mailboxes$/ },
    { method: 'POST', path: /^\/api\/ivr\/voice\/provision-user$/ },
    { method: 'GET', path: /^\/api\/ivr\/voice\/users$/ },
    { method: 'GET', path: /^\/api\/ivr\/voice\/ivr\/.+$/ },
    { method: 'POST', path: /^\/api\/ivr\/voice\/voicemail$/ },
    { method: 'GET', path: /^\/api\/ivr\/voice\/voicemail\/[^\/]+$/ },
    { method: 'POST', path: /^\/api\/ivr\/voice\/webhook$/ },
    { method: 'ALL', path: /^\/api\/ivr\/.+$/ },
];
function isPublicEndpoint(method, path) {
    return PUBLIC_ENDPOINTS.some(endpoint => endpoint.method === method && endpoint.path.test(path));
}
// Hybrid authentication middleware that supports both RBAC cookies and Bearer tokens
export function hybridAuth(req, res, next) {
    // Check if this is a whitelisted public endpoint and skip authentication
    if (isPublicEndpoint(req.method, req.path)) {
        console.log(`🔓 Whitelisted public endpoint accessed: ${req.method} ${req.path}`);
        return next();
    }
    // DEVELOPMENT BYPASS: Allow dev access with special header (LOCALHOST ONLY)
    if (process.env.NODE_ENV === 'development' &&
        req.headers['x-dev-bypass'] === 'true' &&
        (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || !req.ip)) {
        console.log('🔓 Development authentication bypass activated (localhost only)');
        req.user = {
            id: '5cfef28a-b9f2-4bc3-8f18-05521058890e',
            email: 'admin@boreal.com',
            role: 'admin',
            tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            firstName: 'Admin',
            lastName: 'User'
        };
        return next();
    }
    // Try Bearer token authentication first (for external API clients)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        // Check if it's the CLIENT_APP_SHARED_TOKEN
        if (token === CLIENT_APP_SHARED_TOKEN) {
            console.log('Bearer authentication successful');
            req.user = {
                id: '44444444-4444-4444-4444-444444444444',
                role: 'admin',
                tenantId: '00000000-0000-0000-0000-000000000000'
            };
            return next();
        }
        // Try JWT token authentication
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            console.log('JWT Bearer authentication successful');
            return next();
        }
        catch (error) {
            // Bearer token invalid, fall through to cookie auth
        }
    }
    // Try cookie-based RBAC authentication
    const authToken = req.cookies?.auth_token;
    if (authToken) {
        try {
            const decoded = jwt.verify(authToken, JWT_SECRET);
            req.user = decoded;
            console.log('Cookie authentication successful');
            return next();
        }
        catch (error) {
            // Cookie invalid, fall through to 401
        }
    }
    // No valid authentication found
    return res.status(401).json({
        success: false,
        error: 'Authorization required. Provide Bearer token or valid authentication cookie.'
    });
}
