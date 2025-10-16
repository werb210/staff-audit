import { Router } from 'express';
import { db } from '../db';
import { users, insertUserSchema, updateUserSchema } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import sgMail from '@sendgrid/mail';

const router = Router();

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// GET /api/users-management - Get all users with full profile data
router.get('/', async (req: any, res: any) => {
  try {
    console.log('👥 [USERS-MANAGEMENT] Fetching all users...');

    // Get all users with production-ready fields
    const allUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        mobilePhone: users.mobilePhone,
        role: users.role,
        department: users.department,
        is2FAEnabled: users.is2FAEnabled,
        isActive: users.isActive,
        profileImageUrl: users.profileImageUrl,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Legacy field mappings for compatibility
        accessBf: users.accessBf,
        accessSlf: users.accessSlf,
        passwordIsTemporary: users.passwordIsTemporary
      })
      .from(users)
      .orderBy(users.createdAt);

    console.log(`✅ [USERS-MANAGEMENT] Retrieved ${allUsers.length} users`);
    
    res.json({
      success: true,
      data: allUsers,
      count: allUsers.length
    });
  } catch (error: any) {
    console.error('❌ [USERS-MANAGEMENT] Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/users-management/:id - Get single user by ID
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`👤 [USERS-MANAGEMENT] Fetching user: ${id}`);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    console.error('❌ [USERS-MANAGEMENT] Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/users-management - Create new user
router.post('/', async (req: any, res: any) => {
  try {
    console.log('👥 [USERS-MANAGEMENT] Creating new user...');
    console.log('Request body:', req.body);

    // Validate request body against schema
    const validatedData = insertUserSchema.parse(req.body);

    // Auto-enable 2FA if mobile phone is provided
    if (validatedData.mobilePhone && !validatedData.hasOwnProperty('is2FAEnabled')) {
      validatedData.is2FAEnabled = true;
    }

    // Create user in database
    const [newUser] = await db
      .insert(users)
      .values({
        ...validatedData,
        // Map mobilePhone to legacy phone field for backward compatibility
        phone: validatedData.mobilePhone,
        // Set default password as temporary - will be handled by auth system
        passwordIsTemporary: true,
        // Auto-verify phone if mobile provided
        isPhoneVerified: !!validatedData.mobilePhone
      })
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        mobilePhone: users.mobilePhone,
        role: users.role,
        department: users.department,
        is2FAEnabled: users.is2FAEnabled,
        isActive: users.isActive,
        createdAt: users.createdAt
      });

    console.log('✅ [USERS-MANAGEMENT] User created successfully:', newUser.id);
    
    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('❌ [USERS-MANAGEMENT] Error creating user:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Email address already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// PATCH /api/users-management/:id - Update existing user
router.patch('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`👤 [USERS-MANAGEMENT] Updating user: ${id}`);
    console.log('Update data:', req.body);

    // Validate request body
    const validatedData = updateUserSchema.parse({ ...req.body, id });

    // Remove id from update data
    const { id: _, ...updateData } = validatedData;

    // Check if user exists
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id));

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        mobilePhone: users.mobilePhone,
        role: users.role,
        department: users.department,
        is2FAEnabled: users.is2FAEnabled,
        isActive: users.isActive,
        updatedAt: users.updatedAt
      });

    console.log('✅ [USERS-MANAGEMENT] User updated successfully');
    
    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    console.error('❌ [USERS-MANAGEMENT] Error updating user:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/users-management/:id - Soft delete user (set inactive)
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`👤 [USERS-MANAGEMENT] Deactivating user: ${id}`);

    // Soft delete by setting isActive to false
    const [deactivatedUser] = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isActive: users.isActive
      });

    if (!deactivatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ [USERS-MANAGEMENT] User deactivated successfully');
    
    res.json({
      success: true,
      data: deactivatedUser,
      message: 'User deactivated successfully'
    });
  } catch (error: any) {
    console.error('❌ [USERS-MANAGEMENT] Error deactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/users-management/:id/hard-delete - Permanently delete user
router.delete('/:id/hard-delete', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ [USERS-MANAGEMENT] Hard deleting user: ${id}`);

    // Check if user exists first
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Permanently delete user from database
    await db
      .delete(users)
      .where(eq(users.id, id));

    console.log(`✅ [USERS-MANAGEMENT] User permanently deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'User permanently deleted'
    });
  } catch (error: any) {
    console.error('❌ [USERS-MANAGEMENT] Error hard deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/users-management/:id/password-reset - Send password reset email (admin-only)
router.post('/:id/password-reset', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`🔒 [USERS-MANAGEMENT] Password reset requested for user: ${id}`);

    // Get user by ID
    const [user] = await db
      .select({ id: users.id, email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store password reset token
    await db.query(`
      INSERT INTO password_resets (user_id, token_hash, expires_at) 
      VALUES ($1, $2, $3)
    `, [user.id, tokenHash, expires]);

    // Send reset email if SendGrid is configured
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_DEFAULT_FROM) {
      const baseUrl = process.env.BASE_URL || process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      try {
        await sgMail.send({
          to: user.email,
          from: process.env.SENDGRID_DEFAULT_FROM,
          subject: 'Reset your password - Boreal Financial',
          text: `Hello ${user.firstName || 'there'},\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link is valid for 60 minutes.\n\nIf you didn't request this, please ignore this email.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Reset your password</h2>
              <p>Hello ${user.firstName || 'there'},</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
              </div>
              <p><strong>This link is valid for 60 minutes.</strong></p>
              <p>If you didn't request this, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">Boreal Financial - Staff Portal</p>
            </div>
          `
        });

        console.log('✅ [USERS-MANAGEMENT] Password reset email sent successfully');
        res.json({
          success: true,
          message: 'Password reset email sent successfully'
        });
      } catch (emailError: any) {
        console.error('❌ [USERS-MANAGEMENT] Failed to send reset email:', emailError);
        res.status(500).json({
          success: false,
          error: 'Failed to send reset email',
          details: emailError.message
        });
      }
    } else {
      console.log('⚠️ [USERS-MANAGEMENT] SendGrid not configured, returning token for manual use');
      res.json({
        success: true,
        message: 'Password reset token generated (SendGrid not configured)',
        resetUrl: `/reset-password?token=${token}` // For development/testing
      });
    }
  } catch (error: any) {
    console.error('❌ [USERS-MANAGEMENT] Error generating password reset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate password reset',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;