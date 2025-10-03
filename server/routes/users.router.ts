import { Router } from "express";
import { db } from "../db/drizzle";
import { users } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const usersRouter = Router();

usersRouter.get("/me", async (req: any, res: any) => {
  try {
    // read user from cookie/session (adjust to your auth)
    const uid = req.user?.id || null;
    if (!uid) return res.status(401).json({ ok: false, error: "unauthenticated" });
    const rows = await db.select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      role: users.role
    }).from(users).where(eq(users.id, uid));
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "user_not_found" });
    return res.json({ ok: true, user: rows[0] });
  } catch (e) {
    console.error("User me fetch error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

usersRouter.get("/", async (req: any, res: any) => {
  try {
    // protect with admin check if you have it; for now just return list to verify UI
    const rows = await db.select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      role: users.role
    }).from(users).orderBy(desc(users.createdAt)).limit(200);
    return res.json(rows || []);
  } catch (e) {
    console.error("Users list fetch error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default usersRouter;