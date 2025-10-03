import { Router } from 'express';
import { buildBankingAnalysis } from '../banking/analysis.service';

const router = Router();

/**
 * GET /api/banking/analysis/:applicationId?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
router.get('/analysis/:applicationId', async (req: any, res: any, next: any) => {
  try {
    const applicationId = req.params.applicationId;
    const start = (req.query.start as string) || new Date(new Date().setMonth(new Date().getMonth()-3)).toISOString().slice(0,10);
    const end = (req.query.end as string) || new Date().toISOString().slice(0,10);
    const data = await buildBankingAnalysis(applicationId, start, end);
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

export default router;