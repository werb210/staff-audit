import express from "express";
const router = express.Router();

// simple health and Twilio check placeholders
router.get("/health", (_, res) => res.json({ ok: true }));
router.get("/twilio-check", (_, res) => res.json({ connected: true }));

export default router;
