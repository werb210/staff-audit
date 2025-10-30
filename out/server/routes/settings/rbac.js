import { Router } from "express";
import { requireAuth } from "../../auth/verifyOnly";
import { db } from "../../db/drizzle";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
const r = Router();
r.use(requireAuth);
// View-as-role functionality for admins
r.post("/view-as", async (req, res) => {
    try {
        // Only admins can use view-as
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ ok: false, error: "Admin access required" });
        }
        const { targetRole, targetUserId } = req.body;
        const validRoles = ['admin', 'user', 'marketing', 'lender', 'staff'];
        if (!validRoles.includes(targetRole)) {
            return res.status(400).json({ ok: false, error: "Invalid target role" });
        }
        // Create impersonation token
        const impersonationToken = jwt.sign({
            sub: req.user.sub,
            originalRole: req.user.role,
            viewingAs: targetRole,
            viewingAsUserId: targetUserId,
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
        }, process.env.JWT_SECRET);
        res.json({
            ok: true,
            impersonationToken,
            message: `Now viewing as ${targetRole}${targetUserId ? ` (user: ${targetUserId})` : ''}`
        });
    }
    catch (error) {
        console.error('View-as error:', error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Exit view-as mode
r.post("/exit-view-as", async (req, res) => {
    try {
        res.json({ ok: true, message: "Exited view-as mode" });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// List available roles for view-as
r.get("/roles", async (_req, res) => {
    const roles = [
        { id: 'admin', name: 'Administrator', description: 'Full system access' },
        { id: 'user', name: 'User', description: 'Standard user access' },
        { id: 'marketing', name: 'Marketing', description: 'Marketing and campaigns' },
        { id: 'lender', name: 'Lender', description: 'Lender portal access' },
        { id: 'staff', name: 'Staff', description: 'Staff operations' }
    ];
    res.json({ ok: true, roles });
});
// Update user role (admin only)
r.put("/users/:userId/role", async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ ok: false, error: "Admin access required" });
        }
        const { userId } = req.params;
        const { role } = req.body;
        const validRoles = ['admin', 'user', 'marketing', 'lender', 'staff'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ ok: false, error: "Invalid role" });
        }
        await db.update(users)
            .set({ role: role, updatedAt: new Date() })
            .where(eq(users.id, userId));
        res.json({ ok: true, message: "Role updated successfully" });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
export default r;
