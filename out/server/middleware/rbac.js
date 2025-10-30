/**
 * 🔐 ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 *
 * Comprehensive RBAC system for user management and WebAuthn
 */
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
/**
 * Extract and verify JWT token from request
 */
export async function authenticateToken(req, res, next) {
    try {
        // Check for token in multiple places
        let token = req.headers.authorization?.replace('Bearer ', '');
        // Also check cookies for browser requests
        if (!token && req.cookies?.token) {
            token = req.cookies.token;
        }
        // Also check session for browser requests  
        if (!token && req.session && 'token' in req.session) {
            token = req.session.token;
        }
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        // Get fresh user data from database
        const user = await db
            .select({
            id: users.id,
            email: users.email,
            role: users.role,
            firstName: users.firstName,
            lastName: users.lastName,
            tenantId: users.tenantId,
            isActive: users.isActive
        })
            .from(users)
            .where(eq(users.id, decoded.id))
            .limit(1);
        if (!user.length || !user[0].isActive) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }
        req.user = {
            id: user[0].id,
            role: user[0].role,
            tenant_id: user[0].tenantId || '',
            email: user[0].email,
            firstName: user[0].firstName || undefined,
            lastName: user[0].lastName || undefined
        };
        next();
    }
    catch (error) {
        console.error('❌ [AUTH] Token verification failed:', error);
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
}
/**
 * Require specific roles for access
 */
export function requireRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
            });
        }
        next();
    };
}
/**
 * Allow access to own resources or admin/staff
 */
export function requireOwnershipOrAdmin(getUserIdFromParams = true) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // Admin and staff can access anything
        if (['admin', 'staff'].includes(req.user.role)) {
            return next();
        }
        // Check if user is accessing their own resource
        const resourceUserId = getUserIdFromParams ? req.params.id : req.user.id;
        if (req.user.id === resourceUserId) {
            return next();
        }
        return res.status(403).json({
            success: false,
            error: 'Access denied. You can only access your own resources.'
        });
    };
}
/**
 * Development mode bypass for testing
 */
export function developmentAuth(req, res, next) {
    if (process.env.NODE_ENV === 'development' && req.headers['x-dev-bypass'] === 'true') {
        // Set a mock admin user for development testing
        req.user = {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'dev@test.com',
            role: 'admin',
            tenant_id: 'dev-tenant',
            firstName: 'Dev',
            lastName: 'User'
        };
        console.log('🔧 [DEV] Development authentication bypass enabled');
        return next();
    }
    // Try normal authentication
    return authenticateToken(req, res, next);
}
/**
 * Optional authentication - adds user if token exists but doesn't require it
 */
export async function optionalAuth(req, res, next) {
    try {
        let token = req.headers.authorization?.replace('Bearer ', '');
        if (!token && req.cookies?.token) {
            token = req.cookies.token;
        }
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await db
                .select({
                id: users.id,
                email: users.email,
                role: users.role,
                firstName: users.firstName,
                lastName: users.lastName,
                tenantId: users.tenantId,
                isActive: users.isActive
            })
                .from(users)
                .where(eq(users.id, decoded.id))
                .limit(1);
            if (user.length && user[0].isActive) {
                req.user = {
                    id: user[0].id,
                    role: user[0].role,
                    tenant_id: user[0].tenantId || '',
                    email: user[0].email,
                    firstName: user[0].firstName || undefined,
                    lastName: user[0].lastName || undefined
                };
            }
        }
        next();
    }
    catch (error) {
        // Ignore auth errors for optional auth
        next();
    }
}
/**
 * Role hierarchy check
 */
export function hasPermission(userRole, requiredRole) {
    const roleHierarchy = {
        admin: 4,
        staff: 3,
        lender: 2,
        referral_agent: 1,
        client: 0
    };
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
}
/**
 * Require minimum role level
 */
export function requireMinRole(minRole) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!hasPermission(req.user.role, minRole)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Minimum role required: ${minRole}`
            });
        }
        next();
    };
}
