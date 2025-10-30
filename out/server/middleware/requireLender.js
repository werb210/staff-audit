/**
 * Middleware to require lender role authentication
 * Ensures only users with 'lender' role can access lender-specific routes
 */
export function requireLender(req, res, next) {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'Please log in to access lender portal'
        });
    }
    // Check if user has lender role
    if (req.user.role !== 'lender') {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'Lender role required to access this resource',
            userRole: req.user.role
        });
    }
    // User is authenticated and has lender role
    console.log(`🏦 [LENDER-AUTH] Lender access granted: ${req.user.email} (${req.user.role})`);
    next();
}
/**
 * Middleware to redirect users based on their role
 * Ensures lenders don't access staff dashboard and vice versa
 */
export function roleRedirect(req, res, next) {
    // Only redirect authenticated users
    if (!req.user) {
        return next();
    }
    // Redirect lenders trying to access staff dashboard
    if (req.user.role === 'lender' && req.path.startsWith('/dashboard')) {
        console.log(`🔄 [ROLE-REDIRECT] Redirecting lender ${req.user.email} from /dashboard to /lender`);
        return res.redirect('/lender');
    }
    // Redirect staff trying to access lender portal
    if (req.user.role === 'admin' && req.path.startsWith('/lender')) {
        console.log(`🔄 [ROLE-REDIRECT] Redirecting admin ${req.user.email} from /lender to /dashboard`);
        return res.redirect('/dashboard');
    }
    next();
}
