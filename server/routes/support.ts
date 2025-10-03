// server/routes/support.ts
import { Router } from "express";
const router = Router();

// Issues
router.get("/issues", async (_req, res) => {
  // TODO: wire to DB; return empty list for now to unblock UI
  res.json({ ok: true, issues: [] });
});
router.post("/issues", async (req: any, res: any) => {
  // persist { title, severity, description }
  res.status(201).json({ ok: true, id: "tmp_issue_id" });
});

// "Talk to Human" requests
router.get("/handoff", async (_req, res) => res.json({ ok: true, requests: [] }));
router.post("/handoff", async (req: any, res: any) => res.status(201).json({ ok: true, id: "req_1" }));

// Support requests endpoint for communications
router.get("/support-requests", async (_req, res) => {
  res.json({ ok: true, requests: [] });
});

export default router;