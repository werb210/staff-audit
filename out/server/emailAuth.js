import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required for authentication');
}
export const generateTokens = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
    return { token, refreshToken };
};
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
};
export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};
export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};
export const authenticateToken = async (req, res, next) => {
    try {
        // Check for auth token in cookies (multiple possible names for compatibility)
        let token = req.cookies?.auth_token || req.cookies?.session_token;
        // Fallback to Authorization header (legacy flow)
        if (!token) {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            token = authHeader.substring(7);
        }
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        // Verify user still exists
        const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId || undefined,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Unauthorized' });
    }
};
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};
// Password reset functions
export const generateResetToken = () => {
    return crypto.randomUUID();
};
export const createPasswordResetToken = async (userId) => {
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await db.insert(passwordResetTokens).values({
        userId,
        token,
        expiresAt,
    });
    return token;
};
export const validateResetToken = async (token) => {
    const [resetRecord] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));
    if (!resetRecord || resetRecord.expiresAt < new Date()) {
        return null;
    }
    return resetRecord;
};
export const deleteResetToken = async (tokenId) => {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenId));
};
