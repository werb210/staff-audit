// server/api/index.ts
import { Router } from "express";

// ✅ Correctly import the dashboard routes that include /stats
import dashboard from "../routes/dashboard-api.js";   // <-- correct file
import analyticsDashboard from "../routes/analytics-dashboard.js";
import aiControlDashboard from "../routes/ai-control-dashboard.js";

const router = Router();

// ✅ Mount routes
router.use("/dashboard", dashboard);
router.use("/dashboard/analytics", analyticsDashboard);
router.use("/dashboard/ai", aiControlDashboard);

// ✅ Healthcheck endpoint
router.get("/_int/health", (_req, res) => {
  res.json({
    status: "ok",
    source: "server/api/index.ts",
    timestamp: new Date().toISOString(),
  });
});

export default router;
