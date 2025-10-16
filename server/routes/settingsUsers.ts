/**
 * Settings Users Management API Routes
 * Simple user management specifically for Settings screen
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, desc, ilike, sql } from 'drizzle-orm';

const router = Router();

console.log('🔧 [SETTINGS-USERS] Loading settings user management routes...');

// Development authentication middleware with fallback
router.use((req: any, res: any, next: any) => {
  const devBypassToken = process.env.DEV_BYPASS_TOKEN;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Allow bypass with proper token OR in development mode with x-dev-bypass header
  if ((devBypassToken && req.headers['x-dev-bypass'] === devBypassToken) || 
      (isDevelopment && req.headers['x-dev-bypass'] === 'true')) {
    console.log('🔓 [SETTINGS-USERS] Development authentication bypass activated');
    // Simulate admin user for development
    (req as any).user = {
      id: 'dev-admin-user',
      email: 'dev@admin.com',
      role: 'admin',
      tenantId: 'dev-tenant'
    };
    return next();
  }
  
  // Reject access - require proper authentication
  console.log('❌ [SETTINGS-USERS] Authentication required - access denied');
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'This endpoint requires proper authentication'
  });
});

/**
 * GET /api/settings/users - List all users
 */
router.get('/', async (req: any, res: any) => {
  try {
    console.log('👥 [SETTINGS-USERS] Fetching all users...');
    
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    console.log(`✅ [SETTINGS-USERS] Found ${userList.length} users`);

    res.json({
      success: true,
      data: userList,
      count: userList.length
    });

  } catch (error: any) {
    console.error('❌ [SETTINGS-USERS] Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/settings/users - Create new user
 */
router.post('/', async (req: any, res: any) => {
  try {
    const { email, firstName, lastName, phone, role, generatePassword } = req.body;
    
    console.log(`👤 [SETTINGS-USERS] Creating user: ${email} with role: ${role}`);

    // Validate required fields
    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, firstName, lastName, role'
      });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Generate temporary password
    const temporaryPassword = generatePassword ? 
      Math.random().toString(36).slice(-10) : 'ChangeMe123!';
    
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        firstName,
        lastName,
        phone: phone || null,
        role: role as any,
        passwordHash: hashedPassword,
        isActive: true,
        tenantId: '00000000-0000-0000-0000-000000000000' // Use proper UUID format for default tenant
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt
      });

    console.log(`✅ [SETTINGS-USERS] User created: ${newUser.id}`);

    res.status(201).json({
      success: true,
      data: {
        user: newUser,
        temporaryPassword: temporaryPassword
      }
    });

  } catch (error: any) {
    console.error('❌ [SETTINGS-USERS] Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * PATCH /api/settings/users/:id - Update user
 */
router.patch('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, phone, role, isActive } = req.body;

    console.log(`📝 [SETTINGS-USERS] Updating user: ${id}`);

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
    
    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive
      });

    console.log(`✅ [SETTINGS-USERS] User updated: ${updatedUser.id}`);

    res.json({
      success: true,
      data: updatedUser
    });

  } catch (error: any) {
    console.error('❌ [SETTINGS-USERS] Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * DELETE /api/settings/users/:id - Delete user
 */
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [SETTINGS-USERS] Deleting user: ${id}`);

    // Get existing user using raw SQL to avoid schema mismatches
    const existingUserResult = await db.execute(sql`
      SELECT id, email, first_name, last_name FROM users WHERE id = ${id}
    `);

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete user using raw SQL to avoid schema mismatches
    await db.execute(sql`
      DELETE FROM users WHERE id = ${id}
    `);

    console.log(`✅ [SETTINGS-USERS] User deleted: ${id}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ [SETTINGS-USERS] Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

console.log("🟢 [SETTINGS-USERS] Router module loaded - 4 routes registered");
console.log("🟢 [SETTINGS-USERS] Routes: GET /, POST /, PATCH /:id, DELETE /:id");

export default router;