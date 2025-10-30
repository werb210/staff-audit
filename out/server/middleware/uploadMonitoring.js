import { checkUploadFailureAlert } from '../utils/documentStorage.js';
/**
 * Middleware to check for upload failure alerts and add to response headers
 */
export async function uploadMonitoringMiddleware(req, res, next) {
    try {
        // Only check on specific routes to avoid excessive database calls
        if (req.path.includes('/upload') || req.path.includes('/documents')) {
            const { shouldAlert, failureCount } = await checkUploadFailureAlert();
            if (shouldAlert) {
                res.setHeader('X-Upload-Alert', `${failureCount} upload failures in last 5 minutes`);
                console.warn(`🚨 [ADMIN ALERT] ${failureCount} upload failures detected - adding admin notification header`);
            }
        }
        next();
    }
    catch (error) {
        console.error('❌ [UPLOAD MONITORING] Middleware error:', error);
        next(); // Continue even if monitoring fails
    }
}
/**
 * Create admin banner component data for frontend
 */
export async function getAdminAlertData() {
    try {
        const { shouldAlert, failureCount } = await checkUploadFailureAlert();
        if (shouldAlert) {
            return {
                type: 'error',
                message: `System Alert: ${failureCount} document upload failures detected in the last 5 minutes. Check server logs and connectivity.`,
                timestamp: new Date().toISOString(),
                actionRequired: true,
                failureCount
            };
        }
        return null;
    }
    catch (error) {
        console.error('❌ [ADMIN ALERT] Failed to get alert data:', error);
        return null;
    }
}
