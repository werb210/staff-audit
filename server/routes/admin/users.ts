import { Router } from "express";
import { db } from "../../db/drizzle";
import { sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// User role enum validation
const userRoleSchema = z.enum(['admin', 'staff', 'marketing', 'lender', 'referrer']);

// User creation/update schema
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema,
  phone: z.string().nullable().optional(),
  twofa_enabled: z.boolean().default(false)
});

const updateUserSchema = createUserSchema.partial();

// Middleware to check admin role
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    // For now, assume user is authenticated via session or JWT
    // In production, verify user role from session/token
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userResult = await db.execute(sql`
      SELECT role FROM users WHERE id = ${userId}
    `);

    if (!userResult[0] || userResult[0].role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error: unknown) {
    console.error("Admin check error:", error);
    res.status(500).json({ error: "Authorization check failed" });
  }
};

// GET /api/admin/users - List all users
router.get("/api/admin/users", requireAdmin, async (req: any, res: any) => {
  try {
    console.log("📊 Fetching all users for admin management");

    const usersResult = await db.execute(sql`
      SELECT 
        id,
        email,
        name,
        role,
        phone,
        twofa_enabled,
        createdAt,
        updatedAt,
        last_login
      FROM users 
      ORDER BY createdAt DESC
    `);

    const users = usersResult.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      twofaEnabled: user.twofa_enabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.last_login
    }));

    res.json({
      users,
      total: users.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /api/admin/users - Create new user
router.post("/api/admin/users", requireAdmin, async (req: any, res: any) => {
  try {
    const userData = createUserSchema.parse(req.body);
    
    console.log("👤 Creating new user:", userData.email);

    // Check for duplicate email
    const existingUserResult = await db.execute(sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${userData.email})
    `);

    if (existingUserResult.length > 0) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Check for duplicate phone if provided
    if (userData.phone) {
      const existingPhoneResult = await db.execute(sql`
        SELECT id FROM users WHERE phone = ${userData.phone}
      `);

      if (existingPhoneResult.length > 0) {
        return res.status(400).json({ error: "User with this phone number already exists" });
      }
    }

    const userId = `user_${Date.now()}`;

    await db.execute(sql`
      INSERT INTO users (
        id, email, name, role, phone, twofa_enabled, createdAt, updatedAt
      ) VALUES (
        ${userId}, 
        ${userData.email}, 
        ${userData.name}, 
        ${userData.role}, 
        ${userData.phone}, 
        ${userData.twofa_enabled}, 
        NOW(), 
        NOW()
      )
    `);

    // Log the user creation for audit
    await logUserAudit(req.user?.id || 'system', 'CREATE_USER', userId, {
      action: 'User created',
      targetEmail: userData.email,
      role: userData.role
    });

    res.status(201).json({
      success: true,
      userId,
      message: "User created successfully"
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT /api/admin/users/:id - Update user
router.put("/api/admin/users/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userData = updateUserSchema.parse(req.body);
    const currentUserId = req.user?.id || req.session?.userId;

    console.log("✏️ Updating user:", id);

    // Prevent users from removing their own admin access
    if (id === currentUserId && userData.role && userData.role !== 'admin') {
      return res.status(400).json({ error: "Cannot remove your own admin access" });
    }

    // Check if user exists
    const existingUserResult = await db.execute(sql`
      SELECT id, email, role FROM users WHERE id = ${id}
    `);

    if (existingUserResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check for duplicate email if being changed
    if (userData.email) {
      const duplicateEmailResult = await db.execute(sql`
        SELECT id FROM users 
        WHERE LOWER(email) = LOWER(${userData.email}) AND id != ${id}
      `);

      if (duplicateEmailResult.length > 0) {
        return res.status(400).json({ error: "Email already exists for another user" });
      }
    }

    // Check for duplicate phone if being changed
    if (userData.phone) {
      const duplicatePhoneResult = await db.execute(sql`
        SELECT id FROM users 
        WHERE phone = ${userData.phone} AND id != ${id}
      `);

      if (duplicatePhoneResult.length > 0) {
        return res.status(400).json({ error: "Phone number already exists for another user" });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (userData.email) {
      updateFields.push('email = ?');
      updateValues.push(userData.email);
    }
    if (userData.name) {
      updateFields.push('name = ?');
      updateValues.push(userData.name);
    }
    if (userData.role) {
      updateFields.push('role = ?');
      updateValues.push(userData.role);
    }
    if (userData.phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(userData.phone);
    }
    if (userData.twofa_enabled !== undefined) {
      updateFields.push('twofa_enabled = ?');
      updateValues.push(userData.twofa_enabled);
    }

    updateFields.push('updatedAt = NOW()');

    if (updateFields.length === 1) { // Only updatedAt
      return res.status(400).json({ error: "No fields to update" });
    }

    await db.execute(sql.raw(`
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = '${id}'
    `, updateValues));

    // Log the user update for audit
    await logUserAudit(currentUserId, 'UPDATE_USER', id, {
      action: 'User updated',
      changes: userData
    });

    res.json({
      success: true,
      message: "User updated successfully"
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete("/api/admin/users/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id || req.session?.userId;

    console.log("🗑️ Deleting user:", id);

    // Prevent users from deleting themselves
    if (id === currentUserId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // Check if user exists and get details for audit
    const userResult = await db.execute(sql`
      SELECT id, email, role FROM users WHERE id = ${id}
    `);

    if (userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userToDelete = userResult[0];

    // Soft delete or hard delete based on requirements
    await db.execute(sql`
      DELETE FROM users WHERE id = ${id}
    `);

    // Log the user deletion for audit
    await logUserAudit(currentUserId, 'DELETE_USER', id, {
      action: 'User deleted',
      deletedEmail: userToDelete.email,
      deletedRole: userToDelete.role
    });

    res.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// GET /api/admin/users/audit - Get user audit log
router.get("/api/admin/users/audit", requireAdmin, async (req: any, res: any) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const auditResult = await db.execute(sql`
      SELECT 
        id,
        user_id,
        action,
        target_user_id,
        details,
        createdAt
      FROM user_audit_log 
      ORDER BY createdAt DESC 
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `);

    res.json({
      auditLog: auditResult,
      total: auditResult.length
    });

  } catch (error: unknown) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

// Helper function to log user management actions
async function logUserAudit(userId: string, action: string, targetUserId: string, details: any) {
  try {
    await db.execute(sql`
      INSERT INTO user_audit_log (
        id, user_id, action, target_user_id, details, createdAt
      ) VALUES (
        ${`audit_${Date.now()}`}, ${userId}, ${action}, ${targetUserId}, ${JSON.stringify(details)}, NOW()
      )
    `);
  } catch (error: unknown) {
    console.error("Failed to log user audit:", error);
    // Don't fail the main operation if audit logging fails
  }
}

// GET /api/admin/users/roles - Get available roles
router.get("/api/admin/users/roles", requireAdmin, async (req: any, res: any) => {
  try {
    const roles = [
      { value: 'admin', label: 'Administrator', description: 'Full system access' },
      { value: 'staff', label: 'Staff', description: 'Application processing and client management' },
      { value: 'marketing', label: 'Marketing', description: 'Marketing campaigns and lead management' },
      { value: 'lender', label: 'Lender', description: 'Lender portal access' },
      { value: 'referrer', label: 'Referrer', description: 'Referral system access' }
    ];

    res.json({ roles });
  } catch (error: unknown) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

export default router;