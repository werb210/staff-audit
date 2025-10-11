import express from "express";
const router = express.Router();

// Example placeholder
router.get("/", (_req, res) => {
  res.json({ ok: true, route: "analytics" });
});

export default router;
