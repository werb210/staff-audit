// Rate limiting middleware for API protection
import rateLimit from 'express-rate-limit';
// General API rate limiting
export const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests from this IP. Please try again later.',
            retryAfter: Math.ceil(req.rateLimit?.resetTime || Date.now() + 900000)
        });
    }
});
// Stricter rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        error: 'Too many login attempts',
        message: 'Account temporarily locked due to too many failed login attempts.',
        retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
        res.status(429).json({
            error: 'Account temporarily locked',
            message: 'Too many login attempts. Please try again in 15 minutes.',
            retryAfter: 900 // 15 minutes in seconds
        });
    }
});
// Strict rate limiting for admin endpoints
export const adminRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit each IP to 20 admin requests per 5 minutes
    message: {
        error: 'Admin rate limit exceeded',
        message: 'Too many admin requests. Please try again later.',
        retryAfter: '5 minutes'
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Admin rate limit exceeded',
            message: 'Too many admin requests from this IP.',
            retryAfter: Math.ceil(req.rateLimit?.resetTime || Date.now() + 300000)
        });
    }
});
// Lenient rate limiting for public endpoints
export const publicRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Higher limit for public endpoints
    message: {
        error: 'Public API rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: '15 minutes'
    }
});
