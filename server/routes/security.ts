// server/routes/security.ts
import { Router } from "express";
const r = Router();
r.post("/csp-report", (req: any, res: any) => {
  try { console.warn("[CSP]", JSON.stringify(req.body)); } catch {}
  res.sendStatus(204);
});
export default r;