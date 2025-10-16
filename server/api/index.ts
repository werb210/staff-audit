// server/api/index.ts
import { Router } from "express";
import dashboardRoutes from "../routes/dashboard.js";

const router = Router();

// ✅ Health check
router.get("/_int/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ✅ Mount dashboard routes (including /dashboard/stats)
router.use("/dashboard", dashboardRoutes);

export default router;
