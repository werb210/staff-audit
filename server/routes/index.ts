import express from "express";
import analytics from "./analytics/index.js";
import client from "./client/index.js";
import staff from "./staff/index.js";
import twilio from "./twilio/index.js";

const router = express.Router();

// 🧩 Helper: unwrap default exports in case TSX imported { default: router }
const unwrap = (mod: any) => (mod?.default ? mod.default : mod);

router.use("/analytics", unwrap(analytics));
router.use("/client", unwrap(client));
router.use("/staff", unwrap(staff));
router.use("/twilio", unwrap(twilio));

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    routes: ["analytics", "client", "staff", "twilio"],
  });
});

export default router;
