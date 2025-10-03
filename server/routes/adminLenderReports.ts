import { Router } from "express";
import { requireRole } from "../security/rbac";
import { audit } from "../services/audit";
const router = Router();

router.get("/:lenderId", requireRole(["manager","admin"]), (req:any,res)=>{
  res.json({ items: req.app.locals.db.lenderReports.listForLender(req.params.lenderId) });
});

router.post("/", requireRole(["manager","admin"]), (req:any,res)=>{
  const { lenderId, name, type, url, embedUrl } = req.body || {};
  if (!lenderId || !name || !type) return res.status(400).json({ error: "missing_fields" });
  const r = req.app.locals.db.lenderReports.create({ lenderId, name, type, url, embedUrl });
  audit.log({ actor: req.user?.email, action: "lenderReport:add", details: { lenderId, name, type } });
  res.json({ ok:true, report:r });
});

router.delete("/:id", requireRole(["manager","admin"]), (req:any,res)=>{
  const ok = req.app.locals.db.lenderReports.delete(req.params.id);
  audit.log({ actor: req.user?.email, action: "lenderReport:remove", details: { id: req.params.id } });
  res.json({ ok });
});

export default router;