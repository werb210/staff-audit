import { Router } from "express";
export const devStubs = Router();

// calendar & tasks
devStubs.get("/calendar/events", (req: any, res: any) => res.json({ ok: true, events: [] }));
devStubs.get("/calendar/events-old", (req: any, res: any) => res.json({ ok: true, events: [] }));
devStubs.get("/tasks", (_req, res) => res.json({ ok: true, tasks: [] }));
devStubs.get("/tasks-old", (_req, res) => res.json({ ok: true, tasks: [] }));

// reports
devStubs.get("/reports/summary", (_req, res) => res.json({ ok: true, summary: {} }));
devStubs.get("/reports/monthly", (_req, res) => res.json({ ok: true, months: [] }));
devStubs.get("/reports/lenders", (_req, res) => res.json({ ok: true, lenders: [] }));

// marketing
devStubs.get("/marketing/connected-accounts", (_req, res) =>
  res.json({ ok: true, accounts: [] })
);
devStubs.get("/ads/status", (_req, res) => res.json({ ok: true, status: "inactive" }));

// user lists (for any old endpoints your UI still calls)
devStubs.get("/users-old", (_req, res) => res.json({ ok: true, users: [] }));

export default devStubs;