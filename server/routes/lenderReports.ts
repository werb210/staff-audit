import { Router } from "express";
import { requireAnyRole } from "../security/rbac";
import { toCSV } from "../utils/export";
const router = Router();

router.get("/", requireAnyRole(["lender","manager","admin"]), (req:any, res) => {
  const lenderId = req.user?.lenderId || req.user?.id;
  const page = Math.max(1, parseInt(String(req.query.page||"1"),10));
  const size = Math.min(100, Math.max(10, parseInt(String(req.query.size||"20"),10)));
  const all = req.app.locals.db.lenderReports.listForLender(lenderId);
  const start = (page-1)*size;
  const items = all.slice(start, start+size);
  res.set("Cache-Control","public, max-age=30");
  res.json({ items, meta: { page, size, total: all.length } });
});

router.get("/export.csv", requireAnyRole(["lender","manager","admin"]), (req:any, res)=>{
  const lenderId = req.user?.lenderId || req.user?.id;
  const items = req.app.locals.db.lenderReports.listForLender(lenderId);
  const csv = toCSV(items.map((r:any)=>({ id:r.id, name:r.name, type:r.type, url:r.url||"", embedUrl:r.embedUrl||"", createdAt:r.createdAt })));
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",'attachment; filename="lender-reports.csv"');
  res.send(csv);
});

export default router;