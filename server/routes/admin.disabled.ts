import { Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, and, desc, count, sql, or, like, ilike, gte, lte } from 'drizzle-orm';
import { EnhancedAuthMiddleware } from '../enhanced-auth-middleware';
import { UserService } from '../user-service';
import { AuthUtils } from '../auth-utils';

const router = Router();

// Apply authentication and admin role requirement to all routes
router.use(EnhancedAuthMiddleware.authenticate);
router.use(EnhancedAuthMiddleware.requireAdmin);

// Get user statistics
router.get('/users/stats', async (req: any, res: any) => {
  try {
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
    const [admins] = await db.select({ count: count() }).from(users).where(eq(users.role, 'admin'));
    
    // Recent logins (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentLogins] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.lastLogin, sevenDaysAgo));

    res.json({
      total: totalUsers.count,
      active: activeUsers.count,
      admins: admins.count,
      recentLogins: recentLogins.count
    });
  } catch (error: unknown) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user statistics' });
  }
});

// Get users with filtering and search
router.get('/users', async (req: any, res: any) => {
  try {
    const { search, role, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      department: users.department,
      isActive: users.isActive,
      isEmailVerified: users.isEmailVerified,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);

    // Apply filters
    const conditions = [];
    
    if (search) {
      // Use parameterized query to prevent SQL injection
      const searchTerm = String(search).trim();
      if (searchTerm.length > 0) {
        // Sanitize search term and use parameterized query
        const sanitizedTerm = searchTerm.replace(/[%_]/g, '\\$&');
        const searchPattern = `%${sanitizedTerm}%`;
        conditions.push(
          or(
            ilike(users.firstName, searchPattern),
            ilike(users.lastName, searchPattern),
            ilike(users.username, searchPattern),
            ilike(users.email, searchPattern)
          )
        );
      }
    }

    if (role && role !== 'all') {
      conditions.push(eq(users.role, role as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query
      .orderBy(desc(users.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    // Remove sensitive data
    const sanitizedUsers = result.map(user => ({
      ...user,
      passwordHash: undefined,
      emailVerificationToken: undefined,
      passwordResetToken: undefined,
    }));

    res.json(sanitizedUsers);
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Get specific user details
router.get('/users/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        department: users.department,
        isActive: users.isActive,
        isEmailVerified: users.isEmailVerified,
        lastLogin: users.lastLogin,
        preferences: users.preferences,
        metadata: users.metadata,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json(user);
  } catch (error: unknown) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user details' });
  }
});

// Update user status (active/inactive)
router.patch('/users/:userId/status', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isActive must be a boolean' });
    }

    // Prevent deactivating the last admin
    if (!isActive) {
      const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (targetUser?.role === 'admin') {
        const [adminCount] = await db
          .select({ count: count() })
          .from(users)
          .where(and(eq(users.role, 'admin'), eq(users.isActive, true)));
        
        if (adminCount.count <= 1) {
          return res.status(400).json({ 
            success: false, 
            error: 'Cannot deactivate the last active admin user' 
          });
        }
      }
    }

    await db
      .update(users)
      .set({ 
        isActive, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));

    // Log the action
    await db.insert(userAuditLog).values({
      userId: req.user!.id,
      action: 'user_status_changed',
      resource: 'user',
      resourceId: userId,
      newValues: { isActive },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // If deactivating, revoke all sessions
    if (!isActive) {
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.userId, userId));
    }

    res.json({ success: true, message: 'User status updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
});

// Get user sessions
router.get('/users/:userId/sessions', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    const sessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.lastUsed));

    res.json(sessions);
  } catch (error: unknown) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user sessions' });
  }
});

// Revoke user session
router.post('/users/:userId/sessions/:sessionId/revoke', async (req: any, res: any) => {
  try {
    const { userId, sessionId } = req.params;

    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.id, sessionId)
      ));

    // Log the action
    await db.insert(userAuditLog).values({
      userId: req.user!.id,
      action: 'session_revoked',
      resource: 'session',
      resourceId: sessionId,
      newValues: { revokedBy: req.user!.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error: unknown) {
    console.error('Error revoking session:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
});

// Revoke all user sessions
router.post('/users/:userId/sessions/revoke-all', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, userId));

    // Log the action
    await db.insert(userAuditLog).values({
      userId: req.user!.id,
      action: 'all_sessions_revoked',
      resource: 'user',
      resourceId: userId,
      newValues: { revokedBy: req.user!.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'All sessions revoked successfully' });
  } catch (error: unknown) {
    console.error('Error revoking all sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke all sessions' });
  }
});

// Get user login attempts
router.get('/users/:userId/login-attempts', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    // Get user email first
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const attempts = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.email, user.email))
      .orderBy(desc(loginAttempts.attemptedAt))
      .limit(50);

    res.json(attempts);
  } catch (error: unknown) {
    console.error('Error fetching login attempts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch login attempts' });
  }
});

// Reset user password
router.post('/users/:userId/reset-password', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Generate reset token
    const { token, expires } = AuthUtils.generatePasswordResetToken();

    // Update user with reset token
    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log the action
    await db.insert(userAuditLog).values({
      userId: req.user!.id,
      action: 'password_reset_initiated',
      resource: 'user',
      resourceId: userId,
      newValues: { initiatedBy: req.user!.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // In a real application, you would send an email here
    // For now, we'll just return success
    res.json({ 
      success: true, 
      message: 'Password reset initiated. Reset token generated.',
      resetToken: token // Remove this in production
    });
  } catch (error: unknown) {
    console.error('Error initiating password reset:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate password reset' });
  }
});

// Create new user
router.post('/users', async (req: any, res: any) => {
  try {
    const { username, email, password, firstName, lastName, role, department } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, email, and password are required' 
      });
    }

    // Validate password strength
    const passwordValidation = AuthUtils.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))
      .limit(1);

    if (existingUser.length > 0) {
      const existing = existingUser[0];
      if (existing.email === email) {
        return res.status(400).json({ success: false, error: 'Email already exists' });
      }
      if (existing.username === username) {
        return res.status(400).json({ success: false, error: 'Username already exists' });
      }
    }

    // Hash password
    const passwordHash = await AuthUtils.hashPassword(password);
    const userId = AuthUtils.generateUserId();

    // Create user
    const [newUser] = await db.insert(users).values({
      id: userId,
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      role: role || 'staff',
      department,
      isActive: true,
      isEmailVerified: false,
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      department: users.department,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

    // Log the action
    await db.insert(userAuditLog).values({
      userId: req.user!.id,
      action: 'user_created',
      resource: 'user',
      resourceId: newUser.id,
      newValues: { 
        createdBy: req.user!.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role 
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Update user
router.patch('/users/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, role, department, isEmailVerified } = req.body;

    // Get current user data for audit log
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updateData: any = { updatedAt: new Date() };
    const changes: any = {};

    if (firstName !== undefined) {
      updateData.firstName = firstName;
      changes.firstName = { from: currentUser.firstName, to: firstName };
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName;
      changes.lastName = { from: currentUser.lastName, to: lastName };
    }
    if (role !== undefined) {
      updateData.role = role;
      changes.role = { from: currentUser.role, to: role };
    }
    if (department !== undefined) {
      updateData.department = department;
      changes.department = { from: currentUser.department, to: department };
    }
    if (isEmailVerified !== undefined) {
      updateData.isEmailVerified = isEmailVerified;
      changes.isEmailVerified = { from: currentUser.isEmailVerified, to: isEmailVerified };
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    // Log the action
    await db.insert(userAuditLog).values({
      userId: req.user!.id,
      action: 'user_updated',
      resource: 'user',
      resourceId: userId,
      oldValues: Object.fromEntries(Object.entries(changes).map(([k, v]: [string, any]) => [k, v.from])),
      newValues: Object.fromEntries(Object.entries(changes).map(([k, v]: [string, any]) => [k, v.to])),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Delete user (soft delete)
router.delete('/users/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    // Prevent deleting the last admin
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (targetUser?.role === 'admin') {
      const [adminCount] = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.isActive, true)));
      
      if (adminCount.count <= 1) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot delete the last active admin user' 
        });
      }
    }

    // Soft delete by deactivating
    await db
      .update(users)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Revoke all sessions
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, userId));

    // Log the action
    await db.insert(userAuditLog).values({
      userId: req.user!.id,
      action: 'user_deleted',
      resource: 'user',
      resourceId: userId,
      newValues: { deletedBy: req.user!.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// Get audit log for a user
router.get('/users/:userId/audit-log', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const auditEntries = await db
      .select()
      .from(userAuditLog)
      .where(or(
        eq(userAuditLog.userId, userId),
        eq(userAuditLog.resourceId, userId)
      ))
      .orderBy(desc(userAuditLog.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    res.json(auditEntries);
  } catch (error: unknown) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit log' });
  }
});

// Get system audit log
router.get('/audit-log', async (req: any, res: any) => {
  try {
    const { page = '1', limit = '100', action, resource } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = db.select().from(userAuditLog);

    const conditions = [];
    if (action) {
      conditions.push(eq(userAuditLog.action, action as string));
    }
    if (resource) {
      conditions.push(eq(userAuditLog.resource, resource as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const auditEntries = await query
      .orderBy(desc(userAuditLog.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    res.json(auditEntries);
  } catch (error: unknown) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit log' });
  }
});

export default router;