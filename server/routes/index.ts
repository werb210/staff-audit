// server/routes/index.ts
import express from "express";

// Import each subrouter safely
import analytics from "./analytics/index.js";
import client from "./client/index.js";
import staff from "./staff/index.js";
import twilio from "./twilio/index.js";

const router = express.Router();

// Helper to unwrap default exports in case of mixed module systems
const unwrap = (mod: any) => (mod?.default ? mod.default : mod);

// Mount subrouters
router.use("/analytics", unwrap(analytics));
router.use("/client", unwrap(client));
router.use("/staff", unwrap(staff));
router.use("/twilio", unwrap(twilio));

// Root check
router.get("/", (_req, res) => {
  res.json({
    ok: true,
    routes: ["analytics", "client", "staff", "twilio"],
  });
});

export default router;
