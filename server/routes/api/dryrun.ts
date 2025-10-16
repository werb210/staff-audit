import { Router } from 'express';
import { buildPdfData, buildCreditInput, buildLenderExport } from '../../services/_canonFields';
import { db } from '../../db/drizzle';
import { applications } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const router = Router();

async function loadAppById(id: string) {
  const rows = await db.select().from(applications).where(eq(applications.id, id));
  return rows[0] || null;
}

router.post('/applications/:id/dry-run', async (req: any, res: any) => {
  const id = req.params.id;
  const app = await loadAppById(id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  
  // @ts-ignore
  const traceId = req.__traceId || req.headers['x-trace-id'];
  const pdfData    = buildPdfData(app);
  const creditData = buildCreditInput(app);
  const lenderOut  = buildLenderExport(app, String(traceId || 'dryrun'));
  res.json({ ok:true, pdfData, creditData, lenderOut });
});

export default router;