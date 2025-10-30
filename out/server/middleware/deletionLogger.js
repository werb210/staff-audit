/**
 * Deletion Logger Middleware
 *
 * Logs all application deletions with comprehensive audit trail
 * Prevents auto-deletion of fallback applications during cleanup
 */
import { db } from '../db.js';
import { sql } from 'drizzle-orm';
export class ApplicationDeletionLogger {
    static async logDeletion(entry) {
        try {
            await db.execute(sql `
        INSERT INTO application_deletion_log (
          applicationId, user_id, user_email, source, deletion_reason,
          ip_address, user_agent, deleted_at, application_data
        ) VALUES (
          ${entry.applicationId}, ${entry.user_id || null}, ${entry.user_email || null}, 
          ${entry.source}, ${entry.deletion_reason || null}, ${entry.ip_address || null}, 
          ${entry.user_agent || null}, ${entry.deleted_at}, ${JSON.stringify(entry.application_data) || null}
        )
      `);
            console.log(`🗑️ [DELETION LOG] Application ${entry.applicationId} deleted by ${entry.user_email || 'system'} via ${entry.source}`);
        }
        catch (error) {
            console.error('❌ [DELETION LOG] Failed to log deletion:', error);
        }
    }
    static async preventFallbackDeletion(applicationId) {
        // Prevent deletion of fallback applications
        if (applicationId.startsWith('fallback_')) {
            console.log(`🛡️ [DELETION PROTECTION] Preventing deletion of fallback application: ${applicationId}`);
            return false;
        }
        // Check if application has fallback documents
        const fallbackDocs = await db.execute(sql `
      SELECT COUNT(*) as count FROM documents 
      WHERE applicationId = ${applicationId} AND storage_status = 'fallback'
    `);
        const hasFallbackDocs = fallbackDocs.rows[0]?.count > 0;
        if (hasFallbackDocs) {
            console.log(`🛡️ [DELETION PROTECTION] Preventing deletion of application with fallback documents: ${applicationId}`);
            return false;
        }
        return true;
    }
}
export function deletionLoggingMiddleware(req, res, next) {
    // Capture original end method
    const originalEnd = res.end;
    // Override end method to log successful deletions
    res.end = function (chunk, encoding) {
        if (req.method === 'DELETE' && req.route?.path?.includes('applications') && res.statusCode >= 200 && res.statusCode < 300) {
            const applicationId = req.params.id;
            if (applicationId) {
                const logEntry = {
                    applicationId: applicationId,
                    user_email: req.user?.email || 'unknown',
                    user_id: req.user?.id,
                    source: req.headers['x-admin-delete'] ? 'admin_cleanup' : 'staff_ui',
                    deletion_reason: req.body?.reason || req.headers['x-deletion-reason'],
                    ip_address: req.ip || req.headers['x-forwarded-for'],
                    user_agent: req.headers['user-agent'],
                    deleted_at: new Date().toISOString(),
                    application_data: req.deletedApplicationData
                };
                // Log asynchronously to not block response
                ApplicationDeletionLogger.logDeletion(logEntry).catch(console.error);
            }
        }
        // Call original end method
        originalEnd.call(this, chunk, encoding);
    };
    next();
}
