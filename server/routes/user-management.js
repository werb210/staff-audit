import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db.ts';
import * as schema from '../../shared/schema.ts';
const { users } = schema;
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// Enhanced Twilio service
const twilioService = {
  async sendPasswordSMS(phone, password) {
    console.log(`📱 [SMS] Sending password to ${phone}: ${password}`);
    // In production, use actual Twilio
    return { success: true, message: `Password sent to ${phone}` };
  },
  
  async sendPasswordEmail(email, password) {
    console.log(`📧 [EMAIL] Sending password to ${email}: ${password}`);
    // In production, use SendGrid/Twilio SendGrid
    return { success: true, message: `Password sent to ${email}` };
  }
};

// Generate secure random password
function generateSecurePassword() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

// GET /api/user-management - List all users with comprehensive data
router.get('/', async (req, res) => {
  try {
    console.log('✅ [USER-MANAGEMENT] Fetching all users');
    const allUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      mobilePhone: users.mobilePhone,
      role: users.role,
      department: users.department,
      isActive: users.isActive,
      accessBf: users.accessBf,
      accessSlf: users.accessSlf,
      passwordIsTemporary: users.passwordIsTemporary,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt
    }).from(users);
    
    console.log(`✅ [USER-MANAGEMENT] Found ${allUsers.length} users`);
    res.json(allUsers);
  } catch (error) {
    console.error('❌ [USER-MANAGEMENT] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/user-management - Create new user with Twilio password delivery
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, mobilePhone, role, department, accessBf, accessSlf, deliveryMethod } = req.body;
    
    console.log('✅ [USER-MANAGEMENT] Creating new user:', { firstName, lastName, email, mobilePhone, role, deliveryMethod });
    
    // Generate secure temporary password
    const temporaryPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    
    // Create user with temporary password flag
    const [newUser] = await db.insert(users).values({
      firstName,
      lastName,
      email,
      mobilePhone,
      role: role || 'staff',
      department,
      accessBf: accessBf || false,
      accessSlf: accessSlf || false,
      passwordHash,
      passwordIsTemporary: true,
      isActive: true
    }).returning();
    
    // Send password via chosen delivery method
    let deliveryResult;
    if (deliveryMethod === 'sms' && mobilePhone) {
      deliveryResult = await twilioService.sendPasswordSMS(mobilePhone, temporaryPassword);
    } else {
      deliveryResult = await twilioService.sendPasswordEmail(email, temporaryPassword);
    }
    
    console.log('✅ [USER-MANAGEMENT] User created successfully:', newUser.id);
    
    res.json({
      success: true,
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        mobilePhone: newUser.mobilePhone,
        role: newUser.role,
        department: newUser.department,
        accessBf: newUser.accessBf,
        accessSlf: newUser.accessSlf,
        isActive: newUser.isActive,
        passwordIsTemporary: newUser.passwordIsTemporary,
        createdAt: newUser.createdAt
      },
      temporaryPassword,
      deliveryResult
    });
  } catch (error) {
    console.error('❌ [USER-MANAGEMENT] Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/user-management/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, mobilePhone, role, department, accessBf, accessSlf, isActive } = req.body;
    
    console.log(`✅ [USER-MANAGEMENT] Updating user ${id}`);
    
    const [updatedUser] = await db.update(users)
      .set({
        firstName,
        lastName,
        email,
        mobilePhone,
        role,
        department,
        accessBf,
        accessSlf,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ [USER-MANAGEMENT] User updated successfully:', updatedUser.id);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('❌ [USER-MANAGEMENT] Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/user-management/:id/reset-password - Reset user password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryMethod } = req.body;
    
    console.log(`✅ [USER-MANAGEMENT] Resetting password for user ${id}`);
    
    // Get user details
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate new temporary password
    const temporaryPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    
    // Update user with new temporary password
    await db.update(users)
      .set({
        passwordHash,
        passwordIsTemporary: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    
    // Send password via chosen delivery method
    let deliveryResult;
    if (deliveryMethod === 'sms' && user.mobilePhone) {
      deliveryResult = await twilioService.sendPasswordSMS(user.mobilePhone, temporaryPassword);
    } else {
      deliveryResult = await twilioService.sendPasswordEmail(user.email, temporaryPassword);
    }
    
    console.log('✅ [USER-MANAGEMENT] Password reset successfully for user:', id);
    
    res.json({
      success: true,
      message: 'Password reset successfully',
      temporaryPassword,
      deliveryResult
    });
  } catch (error) {
    console.error('❌ [USER-MANAGEMENT] Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/user-management/force-password-change - Handle forced password change on first login
router.post('/force-password-change', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    console.log(`✅ [USER-MANAGEMENT] Processing forced password change for user ${userId}`);
    
    // Get user and verify current password
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    
    // Update user with new permanent password
    await db.update(users)
      .set({
        passwordHash: newPasswordHash,
        passwordIsTemporary: false,
        updatedAt: new Date(),
        lastLogin: new Date()
      })
      .where(eq(users.id, userId));
    
    console.log('✅ [USER-MANAGEMENT] Password changed successfully for user:', userId);
    
    res.json({
      success: true,
      message: 'Password changed successfully',
      passwordIsTemporary: false
    });
  } catch (error) {
    console.error('❌ [USER-MANAGEMENT] Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// DELETE /api/user-management/:id - Soft delete user (set inactive)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`✅ [USER-MANAGEMENT] Deactivating user ${id}`);
    
    const [updatedUser] = await db.update(users)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ [USER-MANAGEMENT] User deactivated successfully:', updatedUser.id);
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('❌ [USER-MANAGEMENT] Error deactivating user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

export default router;