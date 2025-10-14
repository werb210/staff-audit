// server/api/index.ts
import { Router } from "express";

// ✅ Import the correct dashboard router
import dashboard from "../routes/dashboard.js";
import analyticsDashboard from "../routes/analytics-dashboard.js";
import aiControlDashboard from "../routes/ai-control-dashboard.js";

const router = Router();

// ✅ Mount routes
router.use("/dashboard", dashboard);
router.use("/analytics-dashboard", analyticsDashboard);
router.use("/ai-control-dashboard", aiControlDashboard);

// ✅ Healthcheck
router.get("/_int/health", (_req, res) => {
  res.json({
    status: "ok",
    source: "api/index.ts",
    timestamp: new Date().toISOString(),
  });
});

export default router;
