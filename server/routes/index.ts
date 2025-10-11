// server/routes/index.ts
import express from "express";

// Import each router explicitly, making sure they export default router
import analyticsRouter from "./analytics/index.js";
import clientRouter from "./client/index.js";
import staffRouter from "./staff/index.js";
import twilioRouter from "./twilio/index.js";

const router = express.Router();

// Verify routers are valid Express Router instances
function safeUse(path: string, mod: any) {
  if (typeof mod?.use === "function" || typeof mod?.stack !== "undefined") {
    router.use(path, mod);
  } else {
    console.error(`⚠️ Skipping invalid router at ${path}:`, typeof mod);
  }
}

safeUse("/analytics", analyticsRouter);
safeUse("/client", clientRouter);
safeUse("/staff", staffRouter);
safeUse("/twilio", twilioRouter);

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    routes: ["analytics", "client", "staff", "twilio"],
  });
});

export default router;
