import { Router } from "express";
import { requireAuth } from "../auth/verifyOnly";
import { db } from "../db/drizzle";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

const r = Router();
r.use(requireAuth);

// GET /api/admin/users - List all users
r.get("/", async (req: any, res: any) => {
  try {
    // @ts-ignore - Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: "Admin access required" });
    }

    // Use simple select all to avoid column reference issues
    const userList = await db.select().from(users);

    res.json({ ok: true, users: userList });
  } catch (error: any) {
    console.error("[ADMIN USERS] Error:", error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// POST /api/admin/users - Create new user
r.post("/", async (req: any, res: any) => {
  try {
    // @ts-ignore - Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: "Admin access required" });
    }

    const { email, phone, role, firstName, lastName } = req.body || {};
    
    if (!email || !phone || !role) {
      return res.status(400).json({ ok: false, error: "Email, phone, and role are required" });
    }

    const [newUser] = await db.insert(users).values({
      id: email, // Use email as ID for now
      email,
      first_name: firstName,
      last_name: lastName,
      profile_image_url: null
    }).returning();

    res.json({ ok: true, user: newUser });
  } catch (error: any) {
    console.error("[ADMIN USERS] Create error:", error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// PUT /api/admin/users/:id - Update user
r.put("/:id", async (req: any, res: any) => {
  try {
    // @ts-ignore - Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: "Admin access required" });
    }

    const { id } = req.params;
    const { email, phone, role, firstName, lastName, isActive } = req.body || {};

    await db.update(users).set({
      email,
      first_name: firstName,
      last_name: lastName,
      profile_image_url: req.body.profileImageUrl || null,
      updated_at: new Date()
    }).where(eq(users.id, id));

    res.json({ ok: true });
  } catch (error: any) {
    console.error("[ADMIN USERS] Update error:", error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

export default r;