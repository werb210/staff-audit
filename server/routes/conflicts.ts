import { Router } from 'express';
import { collectSourcedValues } from '../conflicts/collectSourcedValues';
import { buildConflicts } from '../conflicts/conflictEngine';

const router = Router();

// Allow public access to conflicts endpoint for demo purposes
const PUBLIC_ENDPOINTS = ['/demo', '/test', '/sample'];

// Skip the auth middleware entirely for conflicts routes during development

/** GET /api/conflicts/:applicationId
 * Returns: { columns: { [column]: { conflict: boolean, values: [{value, sourceType, sourceId, label, observedAt}] } } }
 */
// Create demo endpoint without auth requirement
router.get(['/demo', '/demo.json'], async (_req, res) => {
  res.type('application/json'); // <- ensure JSON, not HTML
  const demo = [
    { column: 'req_business_address', value: '1234 Jasper Ave, Suite 900', sourceType: 'banking', sourceId: 'bank_header', label: 'Bank Statement' },
    { column: 'req_business_address', value: '1234 Jasper Avenue, Ste 900', sourceType: 'client', sourceId: 'client_profile', label: 'Client Application' },
    { column: 'income_statement_net_income', value: 125000, sourceType: 'ocr', sourceId: 'doc-IS-2024', label: 'Income Statement' },
    { column: 'income_statement_net_income', value: 118000, sourceType: 'ocr', sourceId: 'doc-FS-2024', label: 'Financial Statements' }
  ];
  const columns = buildConflicts(demo as any);
  return res.status(200).json({ ok: true, columns });
});

router.get('/:applicationId', async (req: any, res: any, next: any) => {
  try {
    const appId = req.params.applicationId;
    const records = await collectSourcedValues(appId);
    const columns = buildConflicts(records);
    res.json({ ok: true, columns });
  } catch (e) {
    console.error('[CONFLICTS] Error:', e);
    next(e);
  }
});

export default router;