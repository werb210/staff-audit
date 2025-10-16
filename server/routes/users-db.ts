import { Router } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq, desc, ilike, or } from "drizzle-orm";

const router = Router();

// GET /api/users - List all users from database
router.get("/", async (req: any, res: any) => {
  try {
    const q = (req.query.q || "").toString();
    
    let baseQuery = db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      isActive: users.isActive,
      tenantId: users.tenantId,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin
    }).from(users);

    const results = q 
      ? await baseQuery.where(
          or(
            ilike(users.firstName, `%${q}%`),
            ilike(users.lastName, `%${q}%`),
            ilike(users.email, `%${q}%`)
          )
        ).orderBy(desc(users.createdAt)).limit(100)
      : await baseQuery.orderBy(desc(users.createdAt)).limit(100);

    // Format for frontend compatibility  
    const formattedUsers = results.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      active: user.isActive,
      tenantId: user.tenantId,
      createdAt: user.createdAt?.toISOString(),
      lastLogin: user.lastLogin?.toISOString()
    }));

    res.json(formattedUsers);
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/users/:id - Get single user
router.get("/:id", async (req: any, res: any) => {
  try {
    const result = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      isActive: users.isActive,
      tenantId: users.tenantId,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
      mfaEnabled: users.mfaEnabled
    })
    .from(users)
    .where(eq(users.id, req.params.id))
    .limit(1);

    if (!result.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result[0];
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      active: user.isActive,
      tenantId: user.tenantId,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt?.toISOString(),
      lastLogin: user.lastLogin?.toISOString()
    });
  } catch (error: unknown) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/users - Create new user
router.post("/", async (req: any, res: any) => {
  try {
    const { email, role, firstName, lastName, phone, tenantId } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await db.insert(users).values({
      email,
      role: role || "client",
      firstName,
      lastName,
      phone,
      tenantId,
      passwordHash: "", // Will be set during password setup
      isActive: true
    }).returning();

    const newUser = result[0];
    
    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      active: newUser.isActive,
      tenantId: newUser.tenantId,
      createdAt: newUser.createdAt?.toISOString()
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === "23505") { // Unique constraint violation
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PATCH /api/users/:id - Update user
router.patch("/:id", async (req: any, res: any) => {
  try {
    const { role, firstName, lastName, phone, active, tenantId } = req.body;

    const result = await db.update(users)
      .set({
        role,
        firstName,
        lastName,
        phone,
        isActive: active,
        tenantId,
        updatedAt: new Date()
      })
      .where(eq(users.id, req.params.id))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = result[0];
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      active: updatedUser.isActive,
      tenantId: updatedUser.tenantId,
      createdAt: updatedUser.createdAt?.toISOString(),
      updatedAt: updatedUser.updatedAt?.toISOString()
    });
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/users/:id - Delete user (soft delete)
router.delete("/:id", async (req: any, res: any) => {
  try {
    const result = await db.update(users)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, req.params.id))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ ok: true, message: "User deactivated successfully" });
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;