import { Router } from "express";

// ✅ Correct router that includes /stats endpoint
import dashboard from "../routes/dashboard-api.js";
import analyticsDashboard from "../routes/analytics-dashboard.js";
import aiControlDashboard from "../routes/ai-control-dashboard.js";

const router = Router();

router.use("/dashboard", dashboard);
router.use("/dashboard/analytics", analyticsDashboard);
router.use("/dashboard/ai", aiControlDashboard);

// Simple health check endpoint
router.get("/_int/health", (_req, res) => {
  res.json({ status: "ok", source: "server/api/index.ts", timestamp: new Date().toISOString() });
});

export default router;
