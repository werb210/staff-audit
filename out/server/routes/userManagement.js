/**
 * 👥 USER MANAGEMENT ENHANCEMENT
 *
 * Enhanced user management with temporary password support for admins
 *
 * Created: July 25, 2025
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { developmentAuth, requireRoles, requireOwnershipOrAdmin } from '../middleware/rbac';
const router = Router();
/**
 * POST /api/users - Create user with optional temporary password
 */
router.post('/', developmentAuth, requireRoles('admin', 'staff'), async (req, res) => {
    try {
        const { email, firstName, lastName, role, phone, temporaryPassword, tenantId } = req.body;
        if (!email || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                error: 'Email, first name, and last name are required'
            });
        }
        // Check if user already exists
        const existingUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        if (existingUser.length) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        let passwordHash;
        let passwordIsTemporary = false;
        // Handle password setup
        if (temporaryPassword) {
            if (temporaryPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Temporary password must be at least 6 characters'
                });
            }
            passwordHash = await bcrypt.hash(temporaryPassword, 12);
            passwordIsTemporary = true;
            console.log(`👤 [USER CREATION] Setting temporary password for: ${email}`);
        }
        // Create user
        const newUser = await db
            .insert(users)
            .values({
            email,
            firstName,
            lastName,
            role: role || 'staff',
            phone,
            passwordHash,
            passwordIsTemporary,
            tenantId: tenantId || '00000000-0000-0000-0000-000000000000',
            isActive: true
        })
            .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            phone: users.phone,
            passwordIsTemporary: users.passwordIsTemporary,
            isActive: users.isActive,
            createdAt: users.createdAt
        });
        console.log(`✅ [USER CREATION] User created: ${email} (${newUser[0].id})`);
        return res.json({
            success: true,
            message: 'User created successfully',
            user: newUser[0],
            temporaryPassword: passwordIsTemporary
        });
    }
    catch (error) {
        console.error('❌ [USER CREATION] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create user'
        });
    }
});
/**
 * PATCH /api/users/:id - Update user with optional temporary password
 */
router.patch('/:id', developmentAuth, requireOwnershipOrAdmin(), async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, role, phone, temporaryPassword, isActive } = req.body;
        // Find existing user
        const existingUser = await db
            .select({
            id: users.id,
            email: users.email
        })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!existingUser.length) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const updateData = {};
        // Update basic fields
        if (firstName !== undefined)
            updateData.firstName = firstName;
        if (lastName !== undefined)
            updateData.lastName = lastName;
        if (role !== undefined)
            updateData.role = role;
        if (phone !== undefined)
            updateData.phone = phone;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        // Handle temporary password
        if (temporaryPassword) {
            if (temporaryPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Temporary password must be at least 6 characters'
                });
            }
            updateData.passwordHash = await bcrypt.hash(temporaryPassword, 12);
            updateData.passwordIsTemporary = true;
            console.log(`👤 [USER UPDATE] Setting temporary password for: ${existingUser[0].email}`);
        }
        // Update user
        const updatedUser = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            phone: users.phone,
            passwordIsTemporary: users.passwordIsTemporary,
            isActive: users.isActive,
            updatedAt: users.updatedAt
        });
        console.log(`✅ [USER UPDATE] User updated: ${existingUser[0].email}`);
        return res.json({
            success: true,
            message: 'User updated successfully',
            user: updatedUser[0],
            temporaryPassword: Boolean(temporaryPassword)
        });
    }
    catch (error) {
        console.error('❌ [USER UPDATE] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});
/**
 * GET /api/users - List all users with filtering (Admin only)
 */
router.get('/', developmentAuth, requireRoles('admin', 'staff'), async (req, res) => {
    try {
        const { role, isActive, search } = req.query;
        let query = db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            phone: users.phone,
            isActive: users.isActive,
            passwordIsTemporary: users.passwordIsTemporary,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt
        }).from(users);
        // Apply filters
        const whereConditions = [];
        if (role)
            whereConditions.push(eq(users.role, role));
        if (isActive !== undefined)
            whereConditions.push(eq(users.isActive, isActive === 'true'));
        if (whereConditions.length > 0) {
            query = query.where(and(...whereConditions));
        }
        let allUsers = await query;
        // Apply search filter (in-memory for simplicity)
        if (search) {
            const searchTerm = search.toLowerCase();
            allUsers = allUsers.filter(user => user.email?.toLowerCase().includes(searchTerm) ||
                user.firstName?.toLowerCase().includes(searchTerm) ||
                user.lastName?.toLowerCase().includes(searchTerm));
        }
        console.log(`✅ [USER LIST] Retrieved ${allUsers.length} users`);
        return res.json({
            success: true,
            users: allUsers,
            count: allUsers.length
        });
    }
    catch (error) {
        console.error('❌ [USER LIST] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve users'
        });
    }
});
/**
 * DELETE /api/users/:id - Delete user (Admin only)
 */
router.delete('/:id', developmentAuth, requireRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        // Find existing user
        const existingUser = await db
            .select({
            id: users.id,
            email: users.email,
            role: users.role
        })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!existingUser.length) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Prevent deletion of admin users (safety check)
        if (existingUser[0].role === 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Cannot delete admin users'
            });
        }
        // Soft delete: mark as inactive instead of hard delete
        await db
            .update(users)
            .set({
            isActive: false,
            updatedAt: new Date()
        })
            .where(eq(users.id, id));
        console.log(`✅ [USER DELETE] User deactivated: ${existingUser[0].email}`);
        return res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    }
    catch (error) {
        console.error('❌ [USER DELETE] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});
/**
 * POST /api/users/password-reset - Initiate password reset
 */
router.post('/password-reset', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }
        // Find user by email
        const user = await db
            .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
        })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        if (!user.length) {
            // Don't reveal if user exists for security
            return res.json({
                success: true,
                message: 'If the email exists, a password reset link has been sent'
            });
        }
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        // Update user with reset token
        await db
            .update(users)
            .set({
            passwordResetToken: resetToken,
            passwordResetExpiresAt: resetExpires
        })
            .where(eq(users.id, user[0].id));
        console.log(`✅ [PASSWORD RESET] Reset token generated for: ${email}`);
        // In production, send email here
        // For now, return token in development mode
        const responseData = {
            success: true,
            message: 'If the email exists, a password reset link has been sent'
        };
        if (process.env.NODE_ENV === 'development') {
            responseData.resetToken = resetToken; // Only for development
            console.log(`🔧 [DEV] Password reset token: ${resetToken}`);
        }
        return res.json(responseData);
    }
    catch (error) {
        console.error('❌ [PASSWORD RESET] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to process password reset'
        });
    }
});
/**
 * POST /api/users/password-reset/verify - Complete password reset
 */
router.post('/password-reset/verify', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Reset token and new password are required'
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }
        // Find user by reset token
        const user = await db
            .select({
            id: users.id,
            email: users.email,
            passwordResetExpiresAt: users.passwordResetExpiresAt
        })
            .from(users)
            .where(eq(users.passwordResetToken, token))
            .limit(1);
        if (!user.length) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }
        // Check if token is expired
        if (!user[0].passwordResetExpiresAt || user[0].passwordResetExpiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                error: 'Reset token has expired'
            });
        }
        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);
        // Update user with new password and clear reset token
        await db
            .update(users)
            .set({
            passwordHash,
            passwordIsTemporary: false,
            passwordResetToken: null,
            passwordResetExpiresAt: null,
            updatedAt: new Date()
        })
            .where(eq(users.id, user[0].id));
        console.log(`✅ [PASSWORD RESET] Password updated for: ${user[0].email}`);
        return res.json({
            success: true,
            message: 'Password reset successfully'
        });
    }
    catch (error) {
        console.error('❌ [PASSWORD RESET VERIFY] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
});
export default router;
