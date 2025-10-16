import express from "express";
import analyticsRouter from "./analytics/index.js";
import clientRouter from "./client/index.js";
import staffRouter from "./staff/index.js";
import twilioRouter from "./twilio/index.js";

const router = express.Router();

router.use("/analytics", analyticsRouter);
router.use("/client", clientRouter);
router.use("/staff", staffRouter);
router.use("/twilio", twilioRouter);

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    routes: ["analytics", "client", "staff", "twilio"],
  });
});

export default router;
