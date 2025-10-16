import { Router } from "express";
import v1Router from "./v1/index.js";

const router = Router();

// ✅ Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Staff API running correctly",
    timestamp: new Date().toISOString(),
  });
});

// ✅ Root debug route
router.get("/", (req, res) => {
  res.json({ message: "API root reachable" });
});

// ✅ Mount versioned routes
router.use("/v1", v1Router);

export default router;
