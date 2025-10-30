import express from 'express';
import { auditLogger } from '../utils/auditLogger.ts';
const router = express.Router();
// Get recent audit logs
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = auditLogger.getRecentLogs(limit);
        res.json({
            logs,
            total: logs.length,
            message: `Retrieved ${logs.length} recent audit entries`
        });
    }
    catch (error) {
        console.error('❌ [AUDIT] Failed to retrieve logs:', error);
        res.status(500).json({ error: 'Failed to retrieve audit logs' });
    }
});
// Get logs for specific document
router.get('/logs/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const logs = auditLogger.getLogsByDocument(documentId);
        res.json({
            documentId,
            logs,
            total: logs.length,
            message: `Retrieved ${logs.length} audit entries for document ${documentId}`
        });
    }
    catch (error) {
        console.error('❌ [AUDIT] Failed to retrieve document logs:', error);
        res.status(500).json({ error: 'Failed to retrieve document audit logs' });
    }
});
// Generate comprehensive audit report
router.get('/report', async (req, res) => {
    try {
        const report = await auditLogger.generateAuditReport();
        res.json({
            ...report,
            message: 'Audit report generated successfully'
        });
    }
    catch (error) {
        console.error('❌ [AUDIT] Failed to generate report:', error);
        res.status(500).json({ error: 'Failed to generate audit report' });
    }
});
export default router;
