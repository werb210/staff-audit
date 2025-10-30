import { Router } from 'express';
import { backupService } from '../../services/backupService';
import { authMiddleware } from '../../middleware/authJwt';
const router = Router();
// Apply authentication middleware
router.use(authMiddleware);
// Admin middleware - ensure user has admin role
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
router.use(requireAdmin);
// Get backup history
router.get('/history', async (req, res) => {
    try {
        const { limit = 30 } = req.query;
        const history = await backupService.getBackupHistory(parseInt(limit));
        res.json({
            success: true,
            backups: history,
            count: history.length
        });
    }
    catch (error) {
        console.error('Error fetching backup history:', error);
        res.status(500).json({
            error: 'Failed to fetch backup history',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Trigger manual backup
router.post('/trigger', async (req, res) => {
    try {
        const { applicationId } = req.body;
        console.log(`[BACKUP] Manual backup triggered by admin ${req.user?.email}${applicationId ? ` for application ${applicationId}` : ' for all applications'}`);
        const result = await backupService.triggerManualBackup(applicationId);
        res.json(result);
    }
    catch (error) {
        console.error('Error triggering manual backup:', error);
        res.status(500).json({
            success: false,
            message: `Backup trigger failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`
        });
    }
});
// Get backup status/stats
router.get('/stats', async (req, res) => {
    try {
        const history = await backupService.getBackupHistory(100);
        const stats = {
            totalBackups: history.length,
            successfulBackups: history.filter(b => b.status === 'completed').length,
            failedBackups: history.filter(b => b.status === 'failed').length,
            partialBackups: history.filter(b => b.status === 'partial').length,
            totalDocuments: history.reduce((sum, b) => sum + (b.documentsCount || 0), 0),
            totalSizeMb: history.reduce((sum, b) => sum + (b.backupSizeMb || 0), 0),
            lastBackupDate: history.length > 0 ? history[history.length - 1].backupDate : null,
            lastBackupStatus: history.length > 0 ? history[history.length - 1].status : null
        };
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        console.error('Error fetching backup stats:', error);
        res.status(500).json({
            error: 'Failed to fetch backup stats',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
export default router;
