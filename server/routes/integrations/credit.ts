import { Router } from "express";
// REMOVED: requirePermission from authz service (authentication system deleted)
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { enabled, maskPII } from "../../services/integrations/core";
import * as mock from "../../services/integrations/adapters/credit.mock";

const router = Router();

router.post("/pull/:applicationId", async (req:any, res)=>{
  if (!enabled()) return res.status(501).json({ error:"integrations disabled" });
  const appId = String(req.params.applicationId);
  const app = (await db.execute(sql`SELECT id, contact_id FROM applications WHERE id=${appId} LIMIT 1`)).rows?.[0];
  if (!app) return res.status(404).json({ error:"application not found" });

  // Choose provider
  const provider = String(process.env.CREDIT_BUREAU_PROVIDER || "mock").toLowerCase();
  let report:any;
  switch(provider){
    case "mock": report = await mock.pullCreditReport({ applicationId: appId, contactId: app.contact_id }); break;
    default: return res.status(501).json({ error:`provider ${provider} not implemented` });
  }

  const ins = await db.execute(sql`
    INSERT INTO credit_reports(applicationId, provider, bureau_ref, score, score_band, tradelines, inquiries, public_records, raw)
    VALUES (${appId}, ${report.provider}, ${report.bureau_ref}, ${report.score}, ${report.score_band}, ${report.tradelines || []}, ${report.inquiries || []}, ${report.public_records || []}, ${report.raw || {} })
    RETURNING id
  `);
  await db.execute(sql`
    INSERT INTO integration_events(provider, kind, status, message, meta)
    VALUES (${provider}, 'pull', 'ok', 'credit pull complete', ${ { applicationId: appId, reportId: ins.rows?.[0]?.id, score: report.score, score_band: report.score_band } })
  `);

  res.json({ ok:true, id: ins.rows?.[0]?.id, score: report.score, score_band: report.score_band });
});

router.get("/report/:applicationId", async (req: any, res: any)=>{
  const appId = String((req as any).params.applicationId);
  const r = (await db.execute(sql`SELECT * FROM credit_reports WHERE applicationId=${appId} ORDER BY createdAt DESC LIMIT 1`)).rows?.[0];
  if (!r) return res.status(404).json({ error:"not found" });
  // redact raw for UI unless explicitly requested
  r.raw = undefined;
  res.json(r);
});

export default router;