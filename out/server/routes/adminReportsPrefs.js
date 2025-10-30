import { Router } from "express";
import { requireRole } from "../security/rbac";
const router = Router();
router.get("/:lenderId", requireRole(["manager", "admin"]), (req, res) => {
    const row = req.app.locals.db.reportPrefs.get(req.params.lenderId);
    res.json(row);
});
router.post("/:lenderId", requireRole(["manager", "admin"]), (req, res) => {
    const { reports } = req.body || {};
    if (!Array.isArray(reports))
        return res.status(400).json({ error: "bad_body" });
    const row = req.app.locals.db.reportPrefs.set(req.params.lenderId, reports.map(String));
    res.json({ ok: true, ...row });
});
export default router;
