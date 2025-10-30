/**
 * 📊 DOCUMENT AUDIT API ROUTES
 * 
 * Provides comprehensive audit trail and orphaned document management
 * for investigating document disappearance issues.
 */

import { Router } from 'express';
import { getUploadAuditLogs, scanForOrphanedDocuments } from '../utils/hardenedDocumentStorage.js';
import { db } from '../db.js';

const router = Router();

/**
 * GET /api/audit/documents/:documentId/logs
 * Retrieves complete audit trail for a specific document
 */
router.get('/documents/:documentId/logs', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    console.log(`📊 [AUDIT] Retrieving audit logs for document: ${documentId}`);
    
    const auditLogs = await getUploadAuditLogs(documentId);
    
    res.json({
      success: true,
      documentId,
      auditLogs,
      totalEntries: auditLogs.length
    });
    
  } catch (error: unknown) {
    console.error(`❌ [AUDIT] Failed to retrieve audit logs:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

/**
 * GET /api/audit/documents/orphaned
 * Scans for orphaned documents (DB records without disk files)
 */
router.get('/documents/orphaned', async (req: any, res: any) => {
  try {
    console.log(`🔍 [AUDIT] Scanning for orphaned documents...`);
    
    const orphanedIds = await scanForOrphanedDocuments();
    
    res.json({
      success: true,
      orphanedDocuments: orphanedIds,
      count: orphanedIds.length,
      scannedAt: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error(`❌ [AUDIT] Failed to scan for orphaned documents:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan for orphaned documents',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

/**
 * GET /api/audit/uploads/recent
 * Retrieves recent upload attempts with success/failure status
 */
router.get('/uploads/recent', async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    console.log(`📊 [AUDIT] Retrieving recent ${limit} upload attempts...`);
    
    const result = await db.execute(sql`
      SELECT 
        document_id,
        applicationId,
        name,
        upload_attempted_at,
        disk_write_successful,
        s3_backup_successful,
        checksum_verified,
        error_message
      FROM document_upload_log 
      ORDER BY upload_attempted_at DESC 
      LIMIT ${limit}
    `);
    
    const uploads = result.rows.map(row => ({
      documentId: row.document_id,
      applicationId: row.applicationId,
      fileName: row.name,
      uploadAttemptedAt: row.upload_attempted_at,
      diskWriteSuccessful: row.disk_write_successful,
      s3BackupSuccessful: row.s3_backup_successful,
      checksumVerified: row.checksum_verified,
      errorMessage: row.error_message
    }));
    
    // Calculate statistics
    const totalUploads = uploads.length;
    const successfulUploads = uploads.filter(u => u.diskWriteSuccessful).length;
    const failedUploads = totalUploads - successfulUploads;
    const successRate = totalUploads > 0 ? (successfulUploads / totalUploads * 100).toFixed(2) : '0.00';
    
    res.json({
      success: true,
      uploads,
      statistics: {
        totalUploads,
        successfulUploads,
        failedUploads,
        successRate: `${successRate}%`
      },
      retrievedAt: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error(`❌ [AUDIT] Failed to retrieve recent uploads:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent uploads',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

/**
 * POST /api/audit/recovery/attempt/:documentId
 * Attempts to recover a missing document by logging recovery attempt
 */
router.post('/recovery/attempt/:documentId', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    const { recoveryMethod, notes } = req.body;
    
    console.log(`🔄 [RECOVERY] Attempting recovery for document: ${documentId}`);
    
    // Log recovery attempt
    await db.execute(`
      UPDATE document_upload_log 
      SET recovery_attempted_at = NOW(),
          error_message = COALESCE(error_message, '') || ' | Recovery attempted: ' || $2
      WHERE document_id = $1
    `, [documentId, `${recoveryMethod}: ${notes || 'No notes provided'}`]);
    
    res.json({
      success: true,
      documentId,
      recoveryAttemptedAt: new Date().toISOString(),
      recoveryMethod,
      notes
    });
    
  } catch (error: unknown) {
    console.error(`❌ [RECOVERY] Failed to log recovery attempt:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to log recovery attempt',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

export { router as default };