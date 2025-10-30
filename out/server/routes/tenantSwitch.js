import { Router } from "express";
import { requireAnyRole } from "../security/rbac";
import { audit } from "../services/audit";
const router = Router();
// Get current tenant
router.get("/current", requireAnyRole(["admin", "manager", "agent", "marketing", "lender", "referrer"]), (req, res) => {
    console.log(`🎯 [TENANT-CURRENT] User: ${req.user?.email}, Tenant: ${req.tenant}, Session: ${req.session?.tenant}`);
    const tenant = req.tenant || req.session?.tenant || 'bf';
    res.json({ tenant });
});
// Switch tenant (admin/manager only)
router.post("/switch", requireAnyRole(["admin", "manager"]), (req, res) => {
    const { tenant } = req.body;
    if (!tenant || !['bf', 'slf'].includes(tenant)) {
        return res.status(400).json({ error: "invalid_tenant" });
    }
    // Store in session
    req.session.tenant = tenant;
    // Audit logging
    audit.log({
        actor: req.user?.email,
        action: "tenant:switch",
        details: { from: req.tenant, to: tenant }
    });
    res.json({ ok: true, tenant });
});
// Get tenant configuration
router.get("/config", requireAnyRole(["admin", "manager", "agent", "marketing", "lender", "referrer"]), (req, res) => {
    const { TENANT_CONFIG } = require("../middleware/tenant");
    res.json({ config: TENANT_CONFIG });
});
export default router;
