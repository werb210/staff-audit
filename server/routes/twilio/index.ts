import express from "express";
const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, route: "twilio/index operational" });
});

export default router;
