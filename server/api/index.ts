// server/api/index.ts
import { Router } from "express";

// ✅ Import correct dashboard route modules
import dashboard from "../routes/dashboard-api.js"; // <-- FIXED filename
import analyticsDashboard from "../routes/analytics-dashboard.js";
import aiControlDashboard from "../routes/ai-control-dashboard.js";

const router = Router();

// ✅ Mount main and related dashboards
router.use("/dashboard", dashboard);
router.use("/dashboard/analytics", analyticsDashboard);
router.use("/dashboard/ai", aiControlDashboard);

// ✅ Healthcheck
router.get("/_int/health", (_req, res) => {
  res.json({
    status: "ok",
    source: "server/api/index.ts",
    timestamp: new Date().toISOString(),
  });
});

export default router;
