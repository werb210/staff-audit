import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly.js";

const r = Router();
r.use(requireAuth);

// Groups: BS/IS/CF/Taxes/Contracts/Invoices
r.get("/ai/ocr/:applicationId/groups", async (req: any, res: any) => {
  try {
    const appId = req.params.applicationId;
    const { rows } = await db.execute(sql`
      SELECT group_key, COUNT(*) as n,
             json_agg(json_build_object('id',id,'field',field,'value',value,'confidence',confidence) ORDER BY confidence DESC) as items
      FROM ocr_insights
      WHERE applicationId=${appId}
      GROUP BY group_key
      ORDER BY group_key
    `).catch(() => ({ rows: [] }));
    
    res.json({ ok: true, groups: rows });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to get OCR groups" });
  }
});

// Field conflicts + risk
r.get("/ai/ocr/:applicationId/conflicts", async (req: any, res: any) => {
  try {
    const appId = req.params.applicationId;
    
    const conflicts = await db.execute(sql`
      SELECT f.field, f.value_model as model_value, f.value_doc as doc_value, f.delta, f.severity
      FROM field_conflicts f 
      WHERE f.applicationId=${appId}
      ORDER BY f.severity DESC, abs(f.delta) DESC
    `).catch(() => ({ rows: [] }));
    
    const risk = await db.execute(sql`
      SELECT COALESCE(sum(weight),0) as score
      FROM risk_factors 
      WHERE applicationId=${appId}
    `).catch(() => ({ rows: [{ score: 0 }] }));
    
    res.json({ 
      ok: true, 
      conflicts: conflicts.rows, 
      risk: Number(risk.rows?.[0]?.score || 0) 
    });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to get conflicts" });
  }
});

export default r;