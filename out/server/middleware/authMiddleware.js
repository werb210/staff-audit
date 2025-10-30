/**
 * AUTHENTICATION MIDDLEWARE
 * Enhanced auth middleware for CRM platform
 */
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
const JWT_SECRET = process.env.JWT_SECRET || 'boreal-financial-secret-2025';
// Main authentication middleware
export const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') ||
            req.cookies?.bf_auth ||
            req.cookies?.__Host_bf_auth;
        if (!token) {
            return res.status(401).json({
                error: 'authentication_required',
                message: 'Authentication token required'
            });
        }
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        // Get user data
        const userQuery = await db.select().from(users)
            .where(eq(users.id, decoded.id))
            .limit(1);
        if (userQuery.length === 0) {
            return res.status(401).json({
                error: 'user_not_found',
                message: 'User not found'
            });
        }
        const user = userQuery[0];
        // Add user to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            error: 'invalid_token',
            message: 'Invalid or expired authentication token'
        });
    }
};
// Role-based access control
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'authentication_required',
                message: 'Authentication required'
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'insufficient_permissions',
                message: 'Insufficient permissions for this action'
            });
        }
        next();
    };
};
// Admin only middleware
export const requireAdmin = requireRole(['admin']);
// Staff or admin middleware
export const requireStaff = requireRole(['staff', 'admin']);
// Optional authentication (doesn't block if no auth)
export const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') ||
            req.cookies?.bf_auth ||
            req.cookies?.__Host_bf_auth;
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userQuery = await db.select().from(users)
                .where(eq(users.id, decoded.id))
                .limit(1);
            if (userQuery.length > 0) {
                req.user = {
                    id: userQuery[0].id,
                    email: userQuery[0].email,
                    role: userQuery[0].role,
                    name: userQuery[0].name
                };
            }
        }
        next();
    }
    catch (error) {
        // Continue without auth if token is invalid
        next();
    }
};
export default {
    requireAuth,
    requireRole,
    requireAdmin,
    requireStaff,
    optionalAuth
};
