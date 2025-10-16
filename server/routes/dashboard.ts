// server/routes/dashboard.ts
import { Router } from "express";

const router = Router();

// ✅ Sample endpoint for stats
router.get("/stats", async (_req, res) => {
  try {
    // Replace this mock data later with real DB calls
    const stats = {
      applications: 71,
      pending: 25,
      approved: 18,
      total_volume: 2150000,
    };

    res.json({ ok: true, stats });
  } catch (error) {
    console.error("Error in /api/dashboard/stats:", error);
    res.status(500).json({ ok: false, error: "Failed to load dashboard stats" });
  }
});

export default router;
