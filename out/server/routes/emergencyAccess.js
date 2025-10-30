/**
 * Emergency Access Route
 * Temporary bypass for immediate staff portal access
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const router = Router();
/**
 * POST /api/emergency/admin-access - Emergency admin access
 */
router.post('/admin-access', async (req, res) => {
    try {
        console.log('🚨 [EMERGENCY ACCESS] Admin access requested');
        // Find admin user
        const adminUser = await db
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
            .where(eq(users.email, 'todd.w@boreal.financial'))
            .limit(1);
        if (!adminUser.length) {
            return res.status(404).json({
                success: false,
                error: 'Admin user not found'
            });
        }
        const user = adminUser[0];
        // Generate JWT token
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
        };
        const finalToken = jwt.sign(tokenPayload, JWT_SECRET, {
            expiresIn: '8h',
            issuer: 'emergency-access',
            audience: 'staff-portal-users'
        });
        // Update last login
        await db
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));
        console.log(`✅ [EMERGENCY ACCESS] Token generated for: ${user.email}`);
        // Set secure HTTP-only cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 8 * 60 * 60 * 1000, // 8 hours
            path: '/'
        };
        res.cookie('auth_token', finalToken, cookieOptions);
        return res.json({
            success: true,
            message: 'Emergency access granted',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                tenantId: user.tenantId
            },
            token: finalToken,
            expiresIn: '8h',
            emergencyAccess: true
        });
    }
    catch (error) {
        console.error('❌ [EMERGENCY ACCESS] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Emergency access failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * POST /api/emergency/reset-password - Reset password for admin
 */
router.post('/reset-password', async (req, res) => {
    try {
        const bcrypt = await import('bcryptjs');
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await db
            .update(users)
            .set({
            passwordHash: hashedPassword,
            isActive: true
        })
            .where(eq(users.email, 'todd.w@boreal.financial'));
        console.log('✅ [EMERGENCY ACCESS] Password reset for admin user');
        return res.json({
            success: true,
            message: 'Password reset successfully',
            email: 'todd.w@boreal.financial'
        });
    }
    catch (error) {
        console.error('❌ [EMERGENCY ACCESS] Password reset error:', error);
        return res.status(500).json({
            success: false,
            error: 'Password reset failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
