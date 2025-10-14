import { Router } from "express";

// ✅ Import all active dashboard route modules
import dashboard from "../routes/dashboard.js";
import analyticsDashboard from "../routes/analytics-dashboard.js";
import aiControlDashboard from "../routes/ai-control-dashboard.js";

const router = Router();

// ✅ Mount under /dashboard prefix
router.use("/dashboard", dashboard);
router.use("/dashboard/analytics", analyticsDashboard);
router.use("/dashboard/ai", aiControlDashboard);

// ✅ Healthcheck
router.get("/_int/health", (_req, res) => {
  res.json({
    status: "ok",
    source: "api/index.ts",
    timestamp: new Date().toISOString(),
  });
});

export default router;
