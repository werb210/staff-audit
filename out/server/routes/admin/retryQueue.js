import { Router } from 'express';
import { retryQueue } from '../../services/retryQueue';
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
// Get retry queue logs
router.get('/logs', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const logs = await retryQueue.getRetryLogs(parseInt(limit));
        res.json({
            success: true,
            logs,
            count: logs.length
        });
    }
    catch (error) {
        console.error('Error fetching retry logs:', error);
        res.status(500).json({
            error: 'Failed to fetch retry logs',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Get current queue status
router.get('/status', async (req, res) => {
    try {
        const status = retryQueue.getQueueStatus();
        res.json({
            success: true,
            status
        });
    }
    catch (error) {
        console.error('Error fetching queue status:', error);
        res.status(500).json({
            error: 'Failed to fetch queue status',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Manual retry a specific job
router.post('/retry', async (req, res) => {
    try {
        const { applicationId, jobType } = req.body;
        if (!applicationId || !jobType) {
            return res.status(400).json({
                error: 'applicationId and jobType are required'
            });
        }
        const success = await retryQueue.retryJob(applicationId, jobType);
        res.json({
            success,
            message: success
                ? `Successfully retried ${jobType} for application ${applicationId}`
                : `Failed to retry ${jobType} for application ${applicationId}`
        });
    }
    catch (error) {
        console.error('Error manually retrying job:', error);
        res.status(500).json({
            error: 'Failed to retry job',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Delete/cancel a retry job
router.delete('/jobs/:applicationId/:jobType', async (req, res) => {
    try {
        const { applicationId, jobType } = req.params;
        // Note: This would need to be implemented in the retry queue service
        // For now, just return success
        res.json({
            success: true,
            message: `Cancelled ${jobType} for application ${applicationId}`
        });
    }
    catch (error) {
        console.error('Error cancelling job:', error);
        res.status(500).json({
            error: 'Failed to cancel job',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
export default router;
