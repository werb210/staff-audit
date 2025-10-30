import jwt from 'jsonwebtoken';
const PUBLIC_PATHS = [
    '/public/', // Public endpoints
    '/auth/', // Authentication endpoints - CRITICAL for login
    '/api/auth/', // API Authentication endpoints - CRITICAL for login
    '/applications', // Applications list/details (now working)
    '/v1/lenders', // Lender listings  
    '/health', // Health check endpoint
    '/products', // Products API
    '/catalog', // Catalog API
    '/users', // Users management - REQUIRED for UI
    '/pipeline', // Sales pipeline - REQUIRED for UI cards
    '/dashboard', // Dashboard data - REQUIRED for UI
    '/contacts', // Contacts - REQUIRED for UI cards
    '/lenders', // Lenders API
    '/lender-products', // Lender Products API
    '/ai/', // AI endpoints
    '/documents', // Documents API
    '/pipeline/', // Pipeline endpoints
    '/cards/', // Card endpoints - REQUIRED for pipeline drawer
    '/cards', // Card endpoints (without trailing slash)
    '/staff/', // Staff endpoints - REQUIRED for staff app
    '/loan-products', // Loan products endpoint
    '/required-docs' // Required docs API - CRITICAL for client app
];
export function authMiddleware(req, res, next) {
    // Allow public endpoints without authentication
    if (PUBLIC_PATHS.some(path => req.path.startsWith(path))) {
        console.log(`✅ [AUTH-MIDDLEWARE] Allowing public path: ${req.path}`);
        return next();
    }
    console.log(`🔒 [AUTH-MIDDLEWARE] Requiring auth for: ${req.path}`);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'missing_bearer' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
    }
    catch (err) {
        return res.status(403).json({ error: 'invalid_token' });
    }
}
