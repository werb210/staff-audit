import express from "express";
const router = express.Router();

// Mocked response to replace PostgreSQL temporarily
router.get("/", async (_, res) => {
  const now = new Date().toISOString();
  res.json({
    connected: true,
    mock: true,
    timestamp: now,
    message: "PostgreSQL not available; using mock data",
  });
});

export default router;
