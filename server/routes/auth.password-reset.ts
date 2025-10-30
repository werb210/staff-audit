import { Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

const router = Router();

// POST /api/auth/password-reset - Verify token and set new password (public)
router.post('/', async (req: any, res: any) => {
  try {
    const { token, newPassword } = req.body;
    console.log('🔒 [PASSWORD-RESET] Processing password reset request');

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing token or new password'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Hash the token to find it in database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the password reset record
    const { rows } = await db.query(`
      SELECT pr.id, pr.user_id, pr.expires_at, pr.consumed_at
      FROM password_resets pr
      WHERE pr.token_hash = $1
      ORDER BY pr.createdAt DESC
      LIMIT 1
    `, [tokenHash]);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    const resetRecord = rows[0];

    // Check if token is already consumed
    if (resetRecord.consumed_at) {
      return res.status(400).json({
        success: false,
        error: 'Reset token has already been used'
      });
    }

    // Check if token is expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Reset token has expired'
      });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user's password
    await db
      .update(users)
      .set({
        password_hash: passwordHash,
        updatedAt: new Date(),
        passwordIsTemporary: false
      })
      .where(eq(users.id, resetRecord.user_id));

    // Mark the reset token as consumed
    await db.query(`
      UPDATE password_resets 
      SET consumed_at = NOW() 
      WHERE id = $1
    `, [resetRecord.id]);

    // Invalidate all existing sessions for this user (logout everywhere)
    try {
      await db.query(`
        DELETE FROM sessions 
        WHERE user_id = $1
      `, [resetRecord.user_id]);
    } catch (sessionError) {
      console.warn('⚠️ [PASSWORD-RESET] Could not clear sessions (table may not exist):', sessionError);
    }

    console.log('✅ [PASSWORD-RESET] Password reset completed successfully');

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error: any) {
    console.error('❌ [PASSWORD-RESET] Error processing password reset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/auth/password-reset/verify - Verify token validity (public)
router.get('/verify', async (req: any, res: any) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token as string).digest('hex');

    const { rows } = await db.query(`
      SELECT pr.expires_at, pr.consumed_at, u.email, u.firstName
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.token_hash = $1
      ORDER BY pr.createdAt DESC
      LIMIT 1
    `, [tokenHash]);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }

    const resetRecord = rows[0];

    if (resetRecord.consumed_at) {
      return res.status(400).json({
        success: false,
        error: 'Reset token has already been used'
      });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Reset token has expired'
      });
    }

    res.json({
      success: true,
      valid: true,
      email: resetRecord.email,
      firstName: resetRecord.firstName
    });
  } catch (error: any) {
    console.error('❌ [PASSWORD-RESET] Error verifying token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify token',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;