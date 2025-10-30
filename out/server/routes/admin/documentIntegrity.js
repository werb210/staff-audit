import express from 'express';
import { requireRole } from '../middleware/rbac';
import { checkDocumentIntegrity, cleanupOrphanedDocumentRecords, getApplicationDocumentIntegrity } from '../../utils/documentIntegrity';
const router = express.Router();
// Debug middleware
router.use((req, res, next) => {
    console.log(`🔍 Document Integrity Router - ${req.method} ${req.path}`);
    next();
});
// GET /api/admin/documents/integrity - Check overall document integrity
router.get('/integrity', async (req, res) => requireRole(['admin']), async (req, res) => {
    try {
        console.log('🔍 ADMIN: Checking document integrity', {
            adminUser: req.user?.email,
            timestamp: new Date().toISOString()
        });
        const report = await checkDocumentIntegrity();
        console.log('✅ ADMIN: Document integrity check completed', {
            totalDocuments: report.totalDocuments,
            missingFiles: report.missingFiles.length,
            orphanedFiles: report.orphanedFiles.length,
            adminUser: req.user?.email
        });
        res.json({
            success: true,
            report,
            timestamp: new Date().toISOString(),
            checkedBy: req.user?.email
        });
    }
    catch (error) {
        console.error('❌ ADMIN: Document integrity check failed:', error);
        res.status(500).json({
            error: 'Failed to check document integrity',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// POST /api/admin/documents/cleanup - Clean up orphaned document records
router.post('/cleanup', async (req, res) => requireRole(['admin']), async (req, res) => {
    try {
        console.log('🧹 ADMIN: Starting document cleanup', {
            adminUser: req.user?.email,
            timestamp: new Date().toISOString()
        });
        const deletedCount = await cleanupOrphanedDocumentRecords();
        console.log('✅ ADMIN: Document cleanup completed', {
            deletedRecords: deletedCount,
            adminUser: req.user?.email
        });
        res.json({
            success: true,
            deletedRecords: deletedCount,
            message: `Successfully cleaned up ${deletedCount} orphaned document records`,
            timestamp: new Date().toISOString(),
            performedBy: req.user?.email
        });
    }
    catch (error) {
        console.error('❌ ADMIN: Document cleanup failed:', error);
        res.status(500).json({
            error: 'Failed to cleanup orphaned document records',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// GET /api/admin/documents/integrity/:applicationId - Check integrity for specific application
router.get('/integrity/:applicationId', async (req, res) => requireRole(['admin']), async (req, res) => {
    try {
        const { applicationId } = req.params;
        if (!applicationId || typeof applicationId !== 'string') {
            return res.status(400).json({ error: 'Invalid application ID' });
        }
        console.log('🔍 ADMIN: Checking application document integrity', {
            applicationId,
            adminUser: req.user?.email,
            timestamp: new Date().toISOString()
        });
        const report = await getApplicationDocumentIntegrity(applicationId);
        console.log('✅ ADMIN: Application document integrity check completed', {
            applicationId,
            totalDocuments: report.totalDocuments,
            missingFiles: report.missingFiles.length,
            adminUser: req.user?.email
        });
        res.json({
            success: true,
            applicationId,
            report,
            timestamp: new Date().toISOString(),
            checkedBy: req.user?.email
        });
    }
    catch (error) {
        console.error('❌ ADMIN: Application document integrity check failed:', error);
        res.status(500).json({
            error: 'Failed to check application document integrity',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
