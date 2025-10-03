/**
 * RBAC Users Management API Routes
 * Admin-only user management with comprehensive audit logging
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAdmin, RBACRequest, logAuditEvent } from '../middleware/rbacAuth';
import { db } from '../db';
import { users, userRoleEnum } from '../../shared/schema';
import { eq, desc, ilike, and, count, not } from 'drizzle-orm';
import { validatePhoneNumber } from '../utils/phone';

const router = Router();

// Secure development bypass middleware with token validation
router.use((req: any, res: any, next: any) => {
  const devBypassToken = process.env.DEV_BYPASS_TOKEN;
  if (devBypassToken && req.headers['x-dev-bypass'] === devBypassToken) {
    console.log('🔓 Secure development authentication bypass activated for RBAC users');
    // Simulate admin user for development
    (req as any).user = {
      id: 'dev-admin-user',
      email: 'dev@admin.com',
      role: 'admin',
      tenantId: 'dev-tenant'
    };
    return next();
  }
  // Apply normal admin authentication for production
  return requireAdmin()(req, res, next);
});

/**
 * GET /api/rbac/users - List all users with pagination and search
 */
router.get('/', async (req: RBACRequest, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      search = '', 
      role = '', 
      status = 'all' 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitNum = parseInt(limit as string);

    // Build query conditions
    const conditions = [];
    
    if (search) {
      // Sanitize search input to prevent SQL injection
      const sanitizedSearch = String(search).replace(/[%_\\]/g, '\\$&').trim();
      if (sanitizedSearch.length > 0) {
        conditions.push(
          ilike(users.email, `%${sanitizedSearch}%`)
        );
      }
    }

    if (role && role !== 'all') {
      conditions.push(eq(users.role, role as any));
    }

    if (status === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (status === 'inactive') {
      conditions.push(eq(users.isActive, false));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult.count;

    // Get users with pagination
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        department: users.department,
        isActive: users.isActive,
        isEmailVerified: users.isEmailVerified,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        tenantId: users.tenantId
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Log admin access
    await logAuditEvent({
      userId: req.user!.id,
      action: 'LIST_USERS',
      resource: 'users',
      metadata: {
        search,
        role,
        status,
        page,
        limit,
        resultCount: usersList.length
      }
    });

    res.json({
      success: true,
      data: usersList,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error: unknown) {
    console.error('Error listing users:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list users' 
    });
  }
});

/**
 * POST /api/rbac/users - Create new user
 */
router.post('/', async (req: RBACRequest, res) => {
  try {
    const { 
      email, 
      username,
      password, 
      role, 
      firstName, 
      lastName,
      phone,
      department,
      tenantId 
    } = req.body;

    // Validation
    if (!email || !username || !password || !role || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, username, password, role, phone'
      });
    }

    if (!userRoleEnum.enumValues.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${userRoleEnum.enumValues.join(', ')}`
      });
    }

    // Validate and normalize phone number to E.164 format
    let normalizedPhone: string;
    try {
      normalizedPhone = validatePhoneNumber(phone);
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        error: `Invalid phone number: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    // Check if user already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      username,
      passwordHash,
      role,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: normalizedPhone,
      department: department || null,
      tenantId: tenantId || req.user!.tenantId,
      isActive: true,
      isEmailVerified: false
    }).returning({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      department: users.department,
      isActive: users.isActive,
      createdAt: users.createdAt
    });

    // Log user creation
    await logAuditEvent({
      userId: req.user!.id,
      action: 'CREATE_USER',
      resource: 'users',
      resourceId: newUser.id,
      newValues: {
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        department: newUser.department
      },
      metadata: {
        createdBy: req.user!.email
      }
    });

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });

  } catch (error: unknown) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create user' 
    });
  }
});

/**
 * PATCH /api/rbac/users/:id - Update user
 */
router.patch('/:id', async (req: RBACRequest, res) => {
  try {
    const { id } = req.params;
    const { 
      email,
      role, 
      password, 
      firstName, 
      lastName, 
      phone,
      department, 
      isActive 
    } = req.body;

    // Get existing user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prepare update object
    const updateData: any = {};
    const oldValues: any = {};
    const newValues: any = {};

    if (role && role !== existingUser.role) {
      if (!userRoleEnum.enumValues.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Must be one of: ${userRoleEnum.enumValues.join(', ')}`
        });
      }
      oldValues.role = existingUser.role;
      newValues.role = role;
      updateData.role = role;
    }

    if (email !== undefined && email !== existingUser.email) {
      // Check if email is already taken by another user
      const existingEmailUser = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), not(eq(users.id, id))))
        .limit(1);
      
      if (existingEmailUser.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Email already in use by another user'
        });
      }
      
      oldValues.email = existingUser.email;
      newValues.email = email;
      updateData.email = email;
      // Also update username to match email
      updateData.username = email;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
      newValues.passwordChanged = true;
    }

    if (firstName !== undefined) {
      oldValues.firstName = existingUser.firstName;
      newValues.firstName = firstName;
      updateData.firstName = firstName;
    }

    if (lastName !== undefined) {
      oldValues.lastName = existingUser.lastName;
      newValues.lastName = lastName;
      updateData.lastName = lastName;
    }

    if (phone !== undefined) {
      // Validate and normalize phone to E.164 format
      let normalizedPhone = phone;
      if (phone && phone.trim()) {
        try {
          normalizedPhone = validatePhoneNumber(phone);
        } catch (error: unknown) {
          return res.status(400).json({
            success: false,
            error: `Invalid phone number: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
      
      oldValues.phone = existingUser.phone;
      newValues.phone = normalizedPhone;
      updateData.phone = normalizedPhone;
    }

    if (department !== undefined) {
      oldValues.department = existingUser.department;
      newValues.department = department;
      updateData.department = department;
    }

    if (isActive !== undefined) {
      oldValues.isActive = existingUser.isActive;
      newValues.isActive = isActive;
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
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
        email: users.email,
        username: users.username,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        department: users.department,
        isActive: users.isActive,
        updatedAt: users.updatedAt
      });

    // Log user update
    await logAuditEvent({
      userId: req.user!.id,
      action: 'UPDATE_USER',
      resource: 'users',
      resourceId: id,
      oldValues,
      newValues,
      metadata: {
        updatedBy: req.user!.email,
        fieldsChanged: Object.keys(newValues)
      }
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error: unknown) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user' 
    });
  }
});

/**
 * DELETE /api/rbac/users/:id - Deactivate user (soft delete)
 */
router.delete('/:id', async (req: RBACRequest, res) => {
  try {
    const { id } = req.params;

    // Prevent admins from deactivating themselves
    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account'
      });
    }

    // Get existing user
    const [existingUser] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Deactivate user
    const [deactivatedUser] = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        isActive: users.isActive
      });

    // Log user deactivation
    await logAuditEvent({
      userId: req.user!.id,
      action: 'DEACTIVATE_USER',
      resource: 'users',
      resourceId: id,
      oldValues: { isActive: existingUser.isActive },
      newValues: { isActive: false },
      metadata: {
        deactivatedBy: req.user!.email,
        userEmail: existingUser.email,
        userRole: existingUser.role
      }
    });

    res.json({
      success: true,
      data: deactivatedUser,
      message: 'User deactivated successfully'
    });

  } catch (error: unknown) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to deactivate user' 
    });
  }
});

/**
 * DELETE /api/rbac/users/:id/hard-delete - Permanently delete user (ADMIN ONLY)
 * ⚠️ TEMPORARY ADMIN OVERRIDE - This bypasses deletion protection for admins
 */
router.delete('/:id/hard-delete', async (req: RBACRequest, res) => {
  try {
    const { id } = req.params;

    // Double-check admin role (belt and suspenders approach)
    if (req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can permanently delete users',
        code: 'ADMIN_REQUIRED'
      });
    }

    // Prevent admins from deleting themselves
    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        code: 'SELF_DELETE_FORBIDDEN'
      });
    }

    // Get existing user for audit trail
    const [existingUser] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        department: users.department,
        isActive: users.isActive,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // ⚠️ PERMANENT DELETION - This cannot be undone
    await db
      .delete(users)
      .where(eq(users.id, id));

    // Comprehensive audit logging for permanent deletion
    await logAuditEvent({
      userId: req.user!.id,
      action: 'HARD_DELETE_USER',
      resource: 'users',
      resourceId: id,
      oldValues: {
        email: existingUser.email,
        username: existingUser.username,
        role: existingUser.role,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        phone: existingUser.phone,
        department: existingUser.department,
        isActive: existingUser.isActive,
        createdAt: existingUser.createdAt
      },
      newValues: { deleted: true },
      metadata: {
        deletedBy: req.user!.email,
        adminOverride: true,
        deletionType: 'HARD_DELETE',
        warning: 'PERMANENT DELETION - CANNOT BE UNDONE',
        timestamp: new Date().toISOString(),
        deletedUserEmail: existingUser.email,
        deletedUserRole: existingUser.role
      }
    });

    // Log to console for immediate visibility
    console.log(`🚨 [ADMIN HARD DELETE] ${req.user!.email} permanently deleted user ${existingUser.email} (${existingUser.role})`);
    console.log(`⚠️  [PERMANENT] User ID ${id} has been permanently removed from the system`);

    res.json({
      success: true,
      message: 'User permanently deleted',
      data: {
        deletedUser: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role
        },
        deletedBy: req.user!.email,
        deletionType: 'HARD_DELETE',
        timestamp: new Date().toISOString(),
        warning: 'This action cannot be undone'
      }
    });

  } catch (error: unknown) {
    console.error('Error permanently deleting user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete user permanently',
      code: 'DELETE_ERROR'
    });
  }
});

/**
 * GET /api/rbac/users/roles - Get available roles
 */
router.get('/roles', (req: RBACRequest, res) => {
  const roles = userRoleEnum.enumValues.map(role => ({
    value: role,
    label: role.replace('_', ' ').toUpperCase()
  }));

  res.json({
    success: true,
    data: roles
  });
});

export default router;