import express from "express";
const router = express.Router();

// simple health and Twilio check placeholders
router.get("/health", (_, res) => res.json({ ok: true }));
router.get("/twilio-check", (_, res) => res.json({ connected: true }));
router.get("/build", (_req, res) => {
  res.status(200).json({ ok: true, source: "internal" });
});

export default router;
