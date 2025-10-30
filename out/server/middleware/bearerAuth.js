import { CLIENT_APP_SHARED_TOKEN } from '../config';
// Bearer token authentication middleware for public endpoints
export function bearerAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authorization header with Bearer token required'
        });
    }
    const token = authHeader.replace('Bearer ', '');
    // Verify the CLIENT_APP_SHARED_TOKEN from config
    if (token !== CLIENT_APP_SHARED_TOKEN) {
        console.log('Bearer auth failed:', {
            received: token.substring(0, 8) + '...',
            expected: CLIENT_APP_SHARED_TOKEN.substring(0, 8) + '...'
        });
        return res.status(401).json({
            success: false,
            error: 'Invalid Bearer token'
        });
    }
    console.log('Bearer authentication successful');
    // Set a default user object for Bearer token requests
    req.user = {
        id: '44444444-4444-4444-4444-444444444444', // Default admin user ID
        role: 'admin',
        tenantId: '00000000-0000-0000-0000-000000000000'
    };
    next();
}
