import { Router } from 'express';
import { getSystemValidationStatus, runDocumentStartupAudit } from '../services/documentAuditService';
const router = Router();
/**
 * Get system validation status
 */
router.get('/status', async (req, res) => {
    try {
        const status = await getSystemValidationStatus();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...status
        });
    }
    catch (error) {
        console.error('❌ System validation status failed:', error);
        res.status(500).json({
            success: false,
            error: 'System validation failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Manually trigger document audit and backfill
 */
router.post('/backfill', async (req, res) => {
    try {
        const result = await runDocumentStartupAudit();
        res.json({
            success: true,
            message: 'Manual backfill completed',
            ...result
        });
    }
    catch (error) {
        console.error('❌ Manual backfill failed:', error);
        res.status(500).json({
            success: false,
            error: 'Manual backfill failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
