import { Router } from "express";
import { db } from "../db/index.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
const router = Router();
// Validation schemas
const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().default(""),
    mobilePhone: z.string().default(""),
    role: z.enum(['admin', 'staff', 'marketing', 'lender', 'referrer']).default('staff'),
    accessBf: z.boolean().default(false),
    accessSlf: z.boolean().default(false),
    isActive: z.boolean().default(true)
});
const updateUserSchema = createUserSchema.partial().omit({ password: true });
// GET /api/users - List all users
router.get("/users", async (req, res) => {
    try {
        const { page = 1, limit = 50, role, active } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            phone: users.phone,
            mobilePhone: users.mobilePhone,
            role: users.role,
            accessBf: users.accessBf,
            accessSlf: users.accessSlf,
            isActive: users.isActive,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt
        }).from(users);
        if (role) {
            query = query.where(eq(users.role, role));
        }
        if (active !== undefined) {
            query = query.where(eq(users.isActive, active === 'true'));
        }
        const result = await query
            .limit(Number(limit))
            .offset(offset)
            .orderBy(users.createdAt);
        // Get total count
        const totalResult = await db.select().from(users);
        const total = totalResult.length;
        // Format user data with proper role and department display
        const formattedUsers = result.map(user => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role === 'client' ? 'Client' :
                user.role === 'staff' ? 'Staff' :
                    user.role === 'admin' ? 'Administrator' :
                        user.role === 'marketing' ? 'Marketing' :
                            user.role === 'lender' ? 'Lender' :
                                user.role === 'referrer' ? 'Referrer' : 'Unassigned',
            department: user.accessBf && user.accessSlf ? 'Multi-Silo' :
                user.accessBf ? 'Boreal Financial' :
                    user.accessSlf ? 'SLF' : 'Not assigned',
            twoFA: false, // TODO: Add 2FA field to schema when needed
            status: user.isActive,
            lastLogin: user.updatedAt || user.createdAt,
            phone: user.phone,
            mobilePhone: user.mobilePhone,
            accessBf: user.accessBf,
            accessSlf: user.accessSlf,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }));
        res.json({
            users: formattedUsers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
// GET /api/users/me - Get current user
router.get("/users/me", async (req, res) => {
    try {
        // Extract user ID from session or JWT token
        const userId = req.user?.id || req.user?.sub;
        // For development: allow without auth and return first user
        if (!userId) {
            console.log("🔓 [USERS-API] No auth user, returning first user for development");
            const firstUser = await db.select().from(users).limit(1);
            if (firstUser.length > 0) {
                const user = firstUser[0];
                return res.json({
                    id: user.id,
                    email: user.email,
                    roles: [user.role],
                    mfaRequired: user.mfaRequired || false
                });
            }
            return res.status(401).json({ error: "Unauthorized" });
        }
        const result = await db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            mfaRequired: users.mfaRequired || false
        }).from(users).where(eq(users.id, userId)).limit(1);
        if (!result.length) {
            return res.status(404).json({ error: "User not found" });
        }
        const user = result[0];
        res.json({
            id: user.id,
            email: user.email,
            roles: [user.role], // Convert to array for RequireAdmin compatibility
            mfaRequired: user.mfaRequired || false
        });
    }
    catch (error) {
        console.error("Error fetching current user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});
// GET /api/users/:id - Get user by ID
router.get("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            phone: users.phone,
            mobilePhone: users.mobilePhone,
            role: users.role,
            accessBf: users.accessBf,
            accessSlf: users.accessSlf,
            isActive: users.isActive,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt
        }).from(users).where(eq(users.id, id)).limit(1);
        if (!result.length) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ user: result[0] });
    }
    catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});
// POST /api/users - Create new user
router.post("/users", async (req, res) => {
    try {
        // Provide default role if not specified
        const requestData = {
            role: 'staff', // Default role for new users
            accessBf: true, // Default access
            ...req.body
        };
        const userData = createUserSchema.parse(requestData);
        // Check if email already exists
        const existingUser = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.email, userData.email))
            .limit(1);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Email already exists" });
        }
        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 10);
        const result = await db.insert(users).values({
            email: userData.email,
            passwordHash,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            mobilePhone: userData.mobilePhone,
            role: userData.role,
            accessBf: userData.accessBf,
            accessSlf: userData.accessSlf,
            isActive: userData.isActive,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            accessBf: users.accessBf,
            accessSlf: users.accessSlf,
            isActive: users.isActive
        });
        res.status(201).json({ user: result[0] });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Validation failed", details: error.errors });
        }
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});
// PATCH /api/users/:id - Partial update user (for status toggles, etc.)
router.patch("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // For PATCH, we accept any subset of user fields
        const updateData = {};
        if (req.body.isActive !== undefined)
            updateData.isActive = req.body.isActive;
        if (req.body.role !== undefined)
            updateData.role = req.body.role;
        if (req.body.firstName !== undefined)
            updateData.firstName = req.body.firstName;
        if (req.body.lastName !== undefined)
            updateData.lastName = req.body.lastName;
        if (req.body.email !== undefined)
            updateData.email = req.body.email;
        if (req.body.mobilePhone !== undefined)
            updateData.mobilePhone = req.body.mobilePhone;
        if (req.body.department !== undefined)
            updateData.department = req.body.department;
        if (req.body.accessBf !== undefined)
            updateData.accessBf = req.body.accessBf;
        if (req.body.accessSlf !== undefined)
            updateData.accessSlf = req.body.accessSlf;
        updateData.updatedAt = new Date();
        // Check if user exists
        const existingUser = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!existingUser.length) {
            return res.status(404).json({ error: "User not found" });
        }
        const result = await db.update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            department: users.department,
            mobilePhone: users.mobilePhone,
            accessBf: users.accessBf,
            accessSlf: users.accessSlf,
            isActive: users.isActive,
            lastLogin: users.lastLogin,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt
        });
        console.log("✅ [USERS-API] User updated successfully:", result[0]);
        res.json({ user: result[0] });
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});
// PUT /api/users/:id - Full update user  
router.put("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const userData = updateUserSchema.parse(req.body);
        // Check if user exists
        const existingUser = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!existingUser.length) {
            return res.status(404).json({ error: "User not found" });
        }
        // If email is being updated, check for conflicts
        if (userData.email) {
            const emailConflict = await db.select({ id: users.id })
                .from(users)
                .where(eq(users.email, userData.email))
                .limit(1);
            if (emailConflict.length > 0 && emailConflict[0].id !== id) {
                return res.status(400).json({ error: "Email already exists" });
            }
        }
        const result = await db.update(users)
            .set({
            ...userData,
            updatedAt: new Date()
        })
            .where(eq(users.id, id))
            .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            accessBf: users.accessBf,
            accessSlf: users.accessSlf,
            isActive: users.isActive
        });
        res.json({ user: result[0] });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Validation failed", details: error.errors });
        }
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});
// DELETE /api/users/:id - Soft delete user (set inactive)
router.delete("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.update(users)
            .set({
            isActive: false,
            updatedAt: new Date()
        })
            .where(eq(users.id, id))
            .returning({ id: users.id });
        if (!result.length) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ message: "User deactivated successfully" });
    }
    catch (error) {
        console.error("Error deactivating user:", error);
        res.status(500).json({ error: "Failed to deactivate user" });
    }
});
// DELETE /api/users/:id/hard-delete - Permanently delete user
router.delete("/users/:id/hard-delete", async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user exists first
        const existingUser = await db.select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!existingUser.length) {
            return res.status(404).json({ error: "User not found" });
        }
        // First, handle foreign key constraints by deleting or updating related records
        try {
            // Get all applications that reference this user
            const { applications, documents } = await import('../../shared/schema');
            const userApps = await db.select({ id: applications.id })
                .from(applications)
                .where(eq(applications.contactId, id));
            if (userApps.length > 0) {
                const appIds = userApps.map(app => app.id);
                // First delete documents that reference these applications
                for (const appId of appIds) {
                    const deletedDocs = await db.delete(documents)
                        .where(eq(documents.applicationId, appId))
                        .returning({ id: documents.id });
                    if (deletedDocs.length > 0) {
                        console.log(`🗑️ [CASCADE] Deleted ${deletedDocs.length} documents for application: ${appId}`);
                    }
                }
                // Then delete the applications
                const deletedApps = await db.delete(applications)
                    .where(eq(applications.contactId, id))
                    .returning({ id: applications.id });
                console.log(`🗑️ [CASCADE] Deleted ${deletedApps.length} applications for user: ${existingUser[0].email}`);
            }
            // Add other cascade deletions here as needed (notes, etc.)
        }
        catch (cascadeError) {
            console.warn("Warning during cascade deletion:", cascadeError);
            // Continue with user deletion even if cascade has issues
        }
        // Now permanently delete the user
        await db.delete(users)
            .where(eq(users.id, id));
        console.log(`✅ [USERS-API] User permanently deleted: ${existingUser[0].email}`);
        res.json({ message: "User permanently deleted" });
    }
    catch (error) {
        console.error("Error permanently deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});
export default router;
