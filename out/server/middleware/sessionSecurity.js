/**
 * Session Security Middleware
 * Provides comprehensive session security including secure cookies and headers
 */
import { applySecurityHeaders } from '../utils/security';
/**
 * Secure cookie configuration based on environment
 */
export const getSecureCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction, // Only use secure in production (HTTPS)
        sameSite: 'strict', // Prevent CSRF attacks
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        domain: isProduction ? '.replit.app' : undefined // Allow subdomain access in production
    };
};
/**
 * Apply security headers to all responses
 */
export const applySecurityHeadersMiddleware = (req, res, next) => {
    applySecurityHeaders(res);
    next();
};
/**
 * Secure session configuration for express-session
 */
export const getSessionConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        secret: process.env.JWT_SECRET || (() => {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('JWT_SECRET environment variable is required in production');
            }
            return 'fallback-dev-secret-change-in-production';
        })(),
        resave: false,
        saveUninitialized: false,
        name: 'sessionId', // Don't use default 'connect.sid'
        cookie: {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000, // 8 hours
            domain: isProduction ? '.replit.app' : undefined
        },
        rolling: true // Reset expiry on activity
    };
};
/**
 * JWT cookie configuration for authentication
 */
export const setSecureJWTCookie = (res, token) => {
    const cookieOptions = getSecureCookieOptions();
    res.cookie('auth_token', token, cookieOptions);
};
/**
 * Clear authentication cookies securely
 */
export const clearAuthCookies = (res) => {
    const cookieOptions = getSecureCookieOptions();
    res.clearCookie('auth_token', cookieOptions);
    res.clearCookie('sessionId', cookieOptions);
};
/**
 * Middleware to validate session integrity
 */
export const validateSession = (req, res, next) => {
    // Check for session hijacking indicators
    if (req.session) {
        const userAgent = req.get('User-Agent');
        const sessionUserAgent = req.session.userAgent;
        if (sessionUserAgent && sessionUserAgent !== userAgent) {
            console.warn('Session hijacking attempt detected:', {
                sessionId: req.sessionID,
                expectedUserAgent: sessionUserAgent,
                actualUserAgent: userAgent,
                ip: req.ip
            });
            req.session.destroy((err) => {
                if (err)
                    console.error('Session destruction error:', err);
            });
            return res.status(401).json({ error: 'Session security violation' });
        }
        // Store user agent on first use
        if (!sessionUserAgent) {
            req.session.userAgent = userAgent;
        }
    }
    next();
};
/**
 * Middleware to log security events
 */
export const logSecurityEvents = (req, res, next) => {
    // Log suspicious activities
    const suspiciousPatterns = [
        /\.\.\//, // Path traversal
        /<script/, // XSS attempts
        /union.*select/i, // SQL injection
        /eval\(/i, // Code injection
        /javascript:/i // JavaScript injection
    ];
    const requestString = JSON.stringify({
        url: req.url,
        body: req.body,
        query: req.query,
        headers: req.headers
    });
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));
    if (isSuspicious) {
        console.warn('Suspicious request detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        });
        // Could integrate with security monitoring service here
    }
    next();
};
/**
 * Rate limiting configuration for different endpoints
 */
export const getRateLimitConfig = (type) => {
    const configs = {
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // 5 attempts per window
            message: { error: 'Too many authentication attempts, please try again later' },
            standardHeaders: true,
            legacyHeaders: false,
        },
        upload: {
            windowMs: 60 * 1000, // 1 minute
            max: 10, // 10 uploads per minute
            message: { error: 'Too many upload attempts, please try again later' },
            standardHeaders: true,
            legacyHeaders: false,
        },
        api: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // 100 requests per window
            message: { error: 'Too many API requests, please try again later' },
            standardHeaders: true,
            legacyHeaders: false,
        },
        strict: {
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 10, // 10 requests per window
            message: { error: 'Rate limit exceeded for this operation' },
            standardHeaders: true,
            legacyHeaders: false,
        }
    };
    return configs[type];
};
/**
 * Content Security Policy configuration
 */
export const getCSPConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"]) // Only allow unsafe in development
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'",
                "https://api.openai.com",
                "https://api.twilio.com",
                "https://api.signnow.com"
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: isProduction ? [] : false
        }
    };
};
