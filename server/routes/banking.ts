import { Router } from "express";
import { computeBankingMetrics } from "../services/banking";
const router = Router();

/** GET /api/banking/metrics?appId=... */
router.get("/metrics", async (req: any, res: any) => {
  try {
    const appId = req.query.appId as string;
    if (!appId) return res.status(400).json({ error: "missing_appId" });

    // TODO: fetch real transactions for appId. Using stub calc for now.
    const metrics = computeBankingMetrics([]);
    res.json(metrics);
  } catch (e) {
    console.error("[Banking] Metrics error:", e);
    res.status(500).json({ error: "metrics_failed" });
  }
});

export default router;