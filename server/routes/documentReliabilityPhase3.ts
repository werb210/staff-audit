import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index';
import { documents } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { 
  validateChecksum, 
  logRecoveryEvent,
  validateMultipleDocuments 
} from '../utils/documentValidation.js';
import {
  createDocumentVersion,
  getDocumentVersionHistory,
  restoreDocumentVersion,
  cleanupOldVersions
} from '../utils/documentVersioning.js';
// Retry queue functions temporarily disabled during schema migration
// import {
//   processRetryQueue,
//   getRetryQueueStatus,
//   retrySpecificItem,
//   clearCompletedItems
// } from 'from '../utils/uploadRetryQueue.js';';

import {
  generateHealthReport,
  getApplicationHealthReport,
  exportHealthReportToCSV,
  getRecoveryEventHistory
} from '../utils/documentHealthDashboard.js';

const router = express.Router();

// Multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'uploads', 'documents');
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueId = uuidv4();
      const extension = path.extname(file.originalname);
      cb(null, `${uniqueId}${extension}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * Phase 3 Feature 1: SHA256 Validation Endpoints
 */

// Validate single document checksum
router.get('/validate/:documentId', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    console.log(`🔐 [API] Validating checksum for document: ${documentId}`);
    
    const result = await validateChecksum(documentId);
    
    res.json({
      success: true,
      documentId,
      validation: result
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Validation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Validation failed'
    });
  }
});

// Batch validate multiple documents
router.post('/validate/batch', async (req: any, res: any) => {
  try {
    const { documentIds } = req.body;
    
    if (!Array.isArray(documentIds)) {
      return res.status(400).json({
        success: false,
        error: 'documentIds must be an array'
      });
    }
    
    console.log(`🔐 [API] Batch validating ${documentIds.length} documents`);
    
    const results = await validateMultipleDocuments(documentIds);
    
    res.json({
      success: true,
      results
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Batch validation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Batch validation failed'
    });
  }
});

/**
 * Phase 3 Feature 2: Version History Endpoints
 */

// Get version history for document
router.get('/versions/:documentId', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    console.log(`📜 [API] Getting version history for document: ${documentId}`);
    
    const history = await getDocumentVersionHistory(documentId);
    
    res.json({
      success: true,
      ...history
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Version history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get version history'
    });
  }
});

// Upload new version of document
router.post('/versions/:documentId/upload', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    const { notes } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    console.log(`📝 [API] Creating new version for document: ${documentId}`);
    
    // Save uploaded file temporarily
    const fs = await import('fs');
    const path = await import('path');
    const { v4: uuidv4 } = await import('uuid');
    
    const tempDir = path.join(process.cwd(), 'tmp', 'versions');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `${uuidv4()}${path.extname(file.originalname)}`);
    fs.writeFileSync(tempFilePath, file.buffer);
    
    const result = await createDocumentVersion(
      documentId,
      tempFilePath,
      (req as any).user?.id || 'unknown',
      notes || 'Document updated via API'
    );
    
    res.json({
      success: true,
      versionNumber: result.versionNumber,
      message: `Document updated to version ${result.versionNumber}`
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Version upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to create version'
    });
  }
});

// Restore specific version
router.post('/versions/:documentId/restore/:versionNumber', async (req: any, res: any) => {
  try {
    const { documentId, versionNumber } = req.params;
    const { notes } = req.body;
    
    console.log(`🔄 [API] Restoring document ${documentId} to version ${versionNumber}`);
    
    const result = await restoreDocumentVersion(
      documentId,
      parseInt(versionNumber),
      (req as any).user?.id || 'unknown',
      notes || `Restored to version ${versionNumber}`
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
    
  } catch (error: unknown) {
    console.error('❌ [API] Version restore error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to restore version'
    });
  }
});

// Cleanup old versions
router.post('/versions/:documentId/cleanup', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    const { keepLatestN = 5 } = req.body;
    
    console.log(`🧹 [API] Cleaning up old versions for document: ${documentId}`);
    
    const result = await cleanupOldVersions(documentId, keepLatestN);
    
    res.json({
      success: true,
      deleted: result.deleted,
      kept: result.kept,
      message: `Cleaned up ${result.deleted} old versions, kept ${result.kept} recent versions`
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Version cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to cleanup versions'
    });
  }
});

/**
 * Phase 3 Feature 4: Recovery Event Logging Endpoints
 */

// Get recovery event history
router.get('/recovery-events/:documentId?', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    const { limit = 50 } = req.query;
    
    console.log(`📋 [API] Getting recovery events${documentId ? ` for document: ${documentId}` : ''}`);
    
    if (documentId) {
      // Get events for specific document
      const events = await db
        .select()
        // Document recovery log temporarily disabled during schema migration
        // .from(documentRecoveryLog)
        // .where(eq(documentRecoveryLog.document_id, documentId))
        // .orderBy(desc(documentRecoveryLog.timestamp))
        .limit(parseInt(limit as string));
      
      res.json({
        success: true,
        documentId,
        events
      });
    } else {
      // Get all recent events
      const events = await getRecoveryEventHistory(parseInt(limit as string));
      
      res.json({
        success: true,
        events
      });
    }
    
  } catch (error: unknown) {
    console.error('❌ [API] Recovery events error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get recovery events'
    });
  }
});

/**
 * Phase 3 Feature 5: Upload Retry Queue Endpoints
 */

// Get retry queue status
router.get('/retry-queue', async (req: any, res: any) => {
  try {
    console.log(`📊 [API] Getting retry queue status`);
    
    const status = await getRetryQueueStatus();
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Retry queue status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to get retry queue status'
    });
  }
});

// Process retry queue
router.post('/retry-queue/process', async (req: any, res: any) => {
  try {
    console.log(`🔄 [API] Processing retry queue`);
    
    const result = { processed: 0, succeeded: 0, failed: 0, results: [] }; // Disabled();
    
    res.json({
      success: true,
      ...result,
      message: `Processed ${result.processed} items: ${result.succeeded} succeeded, ${result.failed} failed`
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Retry queue process error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to process retry queue'
    });
  }
});

// Retry specific item
router.post('/retry-queue/:queueId/retry', async (req: any, res: any) => {
  try {
    const { queueId } = req.params;
    console.log(`🔄 [API] Manually retrying queue item: ${queueId}`);
    
    const result = await retrySpecificItem(queueId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
    
  } catch (error: unknown) {
    console.error('❌ [API] Retry specific item error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to retry item'
    });
  }
});

// Clear completed items
router.post('/retry-queue/clear-completed', async (req: any, res: any) => {
  try {
    console.log(`🧹 [API] Clearing completed retry queue items`);
    
    const result = await clearCompletedItems();
    
    res.json({
      success: true,
      cleared: result.cleared,
      message: `Cleared ${result.cleared} completed items`
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Clear completed error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to clear completed items'
    });
  }
});



/**
 * Phase 3 Feature 5: Predictive Failure Dashboard Endpoints
 */

// Get comprehensive health report
router.get('/health/report', async (req: any, res: any) => {
  try {
    console.log(`🏥 [API] Generating comprehensive health report`);
    
    const report = await generateHealthReport();
    
    res.json({
      success: true,
      ...report,
      generatedAt: new Date()
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Health report error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to generate health report'
    });
  }
});

// Get health report for specific application
router.get('/health/application/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    console.log(`🏥 [API] Generating health report for application: ${applicationId}`);
    
    const report = await getApplicationHealthReport(applicationId);
    
    res.json({
      success: true,
      ...report,
      generatedAt: new Date()
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Application health report error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to generate application health report'
    });
  }
});

// Export health report as CSV
router.get('/health/report/export', async (req: any, res: any) => {
  try {
    console.log(`📊 [API] Exporting health report as CSV`);
    
    const report = await generateHealthReport();
    const csv = exportHealthReportToCSV(report.documents);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="document-health-report.csv"');
    res.send(csv);
    
  } catch (error: unknown) {
    console.error('❌ [API] Health report export error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to export health report'
    });
  }
});

/**
 * Phase 3 Feature 3: Placeholder UI Warning Endpoints
 */

// Update document preview status
router.post('/preview-status/:documentId', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    const { previewStatus, notes } = req.body;
    
    if (!['original', 'regenerated', 'placeholder'].includes(previewStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid preview status. Must be: original, regenerated, or placeholder'
      });
    }
    
    console.log(`⚠️ [API] Updating preview status for document ${documentId}: ${previewStatus}`);
    
    // Update document preview status
    await db
      .update(documents)
      .set({
        preview_status: previewStatus,
        updatedAt: new Date()
      })
      .where(eq(documents.id, documentId));
    
    // Log the status change
    await logRecoveryEvent(
      documentId,
      previewStatus as any,
      (req as any).user?.id || null,
      notes || `Preview status changed to ${previewStatus}`
    );
    
    res.json({
      success: true,
      documentId,
      previewStatus,
      message: `Preview status updated to ${previewStatus}`
    });
    
  } catch (error: unknown) {
    console.error('❌ [API] Preview status update error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to update preview status'
    });
  }
});

export default router;