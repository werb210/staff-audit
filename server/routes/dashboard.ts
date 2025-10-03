import { Router } from "express";
export const dashboard = Router();

dashboard.get("/kpis", async (_req, res) => {
  res.json({
    ok: true,
    kpis: {
      apps: 71,
      approvals: 18,
      funded: 12,
      revenue: 2150000,
      conversion: 0.24
    }
  });
});

dashboard.get("/activity", async (_req, res) => {
  res.json({
    ok: true,
    activity: [
      { id: "a1", ts: Date.now() - 3600000, type: "note", text: "Docs verified" },
      { id: "a2", ts: Date.now() - 7200000, type: "email", text: "Requested bank statements" },
    ]
  });
});

dashboard.get("/stats", async (_req, res) => {
  res.json({
    ok: true,
    stats: {
      applications: 71,
      pending: 25,
      approved: 18,
      total_volume: 2150000
    }
  });
});

export default dashboard;