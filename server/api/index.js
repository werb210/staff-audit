import { Router } from "express";
import v1Router from "./v1/index.js";

const router = Router();

// ✅ Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Staff App API is live",
    timestamp: new Date().toISOString(),
  });
});

// ✅ Mount versioned routes
router.use("/v1", v1Router);

export default router;
