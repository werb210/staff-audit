import { Router } from "express";
import { requireRole } from "../security/rbac";
import { setImpersonationCookie, clearImpersonationCookie } from "../security/impersonate";
import { audit } from "../services/audit";
const router = Router();
/** POST /api/admin/impersonate  { role, lenderId?, asUserId? } */
router.post("/impersonate", requireRole(["admin"]), (req, res) => {
    const { role, lenderId, asUserId } = req.body || {};
    if (!role)
        return res.status(400).json({ error: "missing_role" });
    setImpersonationCookie(res, { role, lenderId, asUserId, startedAt: Date.now() });
    audit.log({ actor: req.user?.email, action: "impersonate:start", details: { role, lenderId, asUserId } });
    res.json({ ok: true, role, lenderId, asUserId });
});
/** POST /api/admin/impersonate/clear */
router.post("/impersonate/clear", requireRole(["admin"]), (req, res) => {
    clearImpersonationCookie(res);
    audit.log({ actor: req.user?.email, action: "impersonate:stop" });
    res.json({ ok: true });
});
export default router;
