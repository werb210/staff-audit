import { Router } from "express";
import dashboard from "../routes/dashboard.js";

const router = Router();

// Mount routes
router.use("/dashboard", dashboard);

// Healthcheck
router.get("/_int/health", (_req, res) => {
  res.json({ status: "ok", source: "api/index.ts", timestamp: new Date().toISOString() });
});

export default router;
