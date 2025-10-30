import { Router } from 'express';
import { triggerAutoRecoveryFlow, getMissingDocumentsForApplication } from '../utils/autoRecoveryTrigger';
import { recoveryLogger } from '../utils/recoveryLogger';
import { validateRecoveredDocumentUI, validateApplicationDocumentsUI, validateAllRecoveredDocumentsUI } from '../utils/uiRecoveryValidator';
import { fileRecoveryService } from '../utils/fileRecoveryService';
import { pool } from '../db';

const router = Router();

/**
 * AUTO-RECOVERY API ENDPOINTS
 * Provides REST API access to the 3 recovery automations
 */

// AUTO-RECOVERY 1: Trigger missing document detection
router.post('/trigger-detection', async (req: any, res: any) => {
  try {
    console.log('🔄 [AUTO-RECOVERY API] Triggering missing document detection...');
    
    const result = await triggerAutoRecoveryFlow();
    
    // Log each missing document detected
    for (const alert of result.alerts) {
      await recoveryLogger.logMissingDetected(
        alert.documentId,
        alert.fileName,
        alert.applicationId,
        alert.businessName,
        alert.expectedPath
      );
    }

    res.json({
      success: true,
      automation: 'AUTO-RECOVERY 1',
      message: 'Missing document detection completed',
      results: {
        totalScanned: result.totalScanned,
        missingDetected: result.missingDetected,
        recoveryTriggered: result.recoveryTriggered,
        alerts: result.alerts
      }
    });

  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Detection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger recovery detection',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 1: Get missing documents for specific application
router.get('/application/:id/missing', async (req: any, res: any) => {
  try {
    const { id: applicationId } = req.params;
    console.log(`🔍 [AUTO-RECOVERY API] Getting missing documents for application: ${applicationId}`);
    
    const missingDocs = await getMissingDocumentsForApplication(applicationId);
    
    res.json({
      success: true,
      automation: 'AUTO-RECOVERY 1',
      applicationId,
      missingDocuments: missingDocs,
      totalMissing: missingDocs.length
    });

  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Application scan failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan application documents',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 2: Get recovery statistics
router.get('/stats', async (req: any, res: any) => {
  try {
    console.log('📊 [AUTO-RECOVERY API] Getting recovery statistics...');
    
    const stats = await recoveryLogger.getRecoveryStats();
    
    res.json({
      success: true,
      automation: 'AUTO-RECOVERY 2',
      statistics: stats
    });

  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recovery statistics',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 2: Manual recovery logging (for staff use)
router.post('/log-recovery', async (req: any, res: any) => {
  try {
    const { documentId, fileName, applicationId, businessName, status, details } = req.body;
    
    console.log(`📝 [AUTO-RECOVERY API] Manual recovery log: ${status} for ${fileName}`);
    
    if (status === 'RECOVERED') {
      await recoveryLogger.logRecoverySuccess(
        documentId,
        fileName,
        applicationId,
        businessName,
        req.body.originalPath || 'Unknown',
        req.body.newPath || 'Unknown',
        req.body.fileSize || 0,
        req.body.uploadedBy || 'staff'
      );
    } else if (status === 'RECOVERY_INITIATED') {
      await recoveryLogger.logRecoveryInitiated(
        documentId,
        fileName,
        applicationId,
        businessName
      );
    } else if (status === 'RECOVERY_FAILED') {
      await recoveryLogger.logRecoveryFailure(
        documentId,
        fileName,
        applicationId,
        businessName,
        details || 'Unknown error'
      );
    }

    res.json({
      success: true,
      automation: 'AUTO-RECOVERY 2',
      message: `Recovery event logged: ${status}`,
      documentId,
      fileName
    });

  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Manual logging failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log recovery event',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 3: Validate UI for single document
router.get('/validate/:documentId', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    console.log(`🔍 [AUTO-RECOVERY API] Validating UI for document: ${documentId}`);
    
    const validation = await validateRecoveredDocumentUI(documentId);
    
    res.json({
      success: true,
      automation: 'AUTO-RECOVERY 3',
      validation
    });

  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Document validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate document UI',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 3: Validate UI for all documents in application
router.get('/validate/application/:id', async (req: any, res: any) => {
  try {
    const { id: applicationId } = req.params;
    console.log(`📋 [AUTO-RECOVERY API] Validating UI for application: ${applicationId}`);
    
    const status = await validateApplicationDocumentsUI(applicationId);
    
    res.json({
      success: true,
      automation: 'AUTO-RECOVERY 3',
      applicationId,
      validationStatus: status
    });

  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Application validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate application documents',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 3: Validate UI for all documents globally
router.get('/validate/all', async (req: any, res: any) => {
  try {
    console.log('🔄 [AUTO-RECOVERY API] Validating UI for all documents...');
    
    const status = await validateAllRecoveredDocumentsUI();
    
    res.json({
      success: true,
      automation: 'AUTO-RECOVERY 3',
      globalValidation: status
    });

  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Global validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate all documents',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Combined recovery workflow: Detection + Logging + Validation
router.post('/run-complete-recovery/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    console.log(`🔄 [AUTO-RECOVERY API] Running complete recovery workflow for: ${applicationId}`);
    
    // Step 1: Detect missing documents
    const missingDocs = await getMissingDocumentsForApplication(applicationId);
    
    // Step 2: Log missing documents
    for (const doc of missingDocs) {
      await recoveryLogger.logMissingDetected(
        doc.documentId,
        doc.fileName,
        doc.applicationId,
        doc.businessName,
        doc.expectedPath
      );
    }
    
    // Step 3: Validate UI for all documents
    const uiStatus = await validateApplicationDocumentsUI(applicationId);
    
    // Step 4: Get recovery statistics
    const stats = await recoveryLogger.getRecoveryStats();
    
    res.json({
      success: true,
      message: 'Complete recovery workflow executed',
      applicationId,
      workflow: {
        step1_detection: {
          totalMissing: missingDocs.length,
          missingDocuments: missingDocs
        },
        step2_logging: {
          eventsLogged: missingDocs.length,
          totalEvents: stats.totalEvents
        },
        step3_validation: {
          totalValidated: uiStatus.totalValidated,
          passedValidation: uiStatus.passedValidation,
          failedValidation: uiStatus.failedValidation
        }
      }
    });

  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Complete workflow failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run complete recovery workflow',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 4: Get system status and recovery statistics
router.get('/status', async (req: any, res: any) => {
  try {
    console.log('🔄 [AUTO-RECOVERY API] System status check requested...');
    
    // Get system statistics
    const docsQuery = 'SELECT COUNT(*) as total FROM documents';
    const docsResult = await pool.query(docsQuery);
    const totalDocuments = parseInt(docsResult.rows[0].total);
    
    // Check missing documents count 
    let missingCount = 0;
    try {
      const result = await autoRecoveryTrigger.triggerMissingDocumentDetection();
      missingCount = result.missingDetected;
    } catch (error: unknown) {
      console.error('❌ [AUTO-RECOVERY 4] Failed to get missing count:', error);
    }
    
    // Get recent recovery logs
    const logsQuery = 'SELECT COUNT(*) as count FROM recovery_logs WHERE createdAt > NOW() - INTERVAL \'24 hours\'';
    const logsResult = await pool.query(logsQuery);
    const recentRecoveries = parseInt(logsResult.rows[0].count || 0);
    
    const status = {
      success: true,
      automation: 'AUTO-RECOVERY 4',
      systemStatus: {
        totalDocuments,
        missingDocuments: missingCount,
        recentRecoveries,
        systemHealth: missingCount === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
        lastChecked: new Date().toISOString()
      }
    };
    
    console.log(`✅ [AUTO-RECOVERY 4] System status: ${status.systemStatus.systemHealth}`);
    console.log(`   └─ Total documents: ${totalDocuments}`);
    console.log(`   └─ Missing documents: ${missingCount}`);
    console.log(`   └─ Recent recoveries: ${recentRecoveries}`);
    
    res.json(status);
    
  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY 4] Status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 5: Actual file recovery for single document
router.post('/recover-document/:documentId', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    console.log(`🔄 [AUTO-RECOVERY API] Starting file recovery for document: ${documentId}`);
    
    const result = await fileRecoveryService.recoverMissingDocument(documentId);
    
    if (result.success) {
      res.json({
        success: true,
        automation: 'AUTO-RECOVERY 5',
        message: 'Document file recovered successfully',
        recovery: {
          documentId,
          recoveryMethod: result.recoveryMethod,
          newPath: result.newPath,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(404).json({
        success: false,
        automation: 'AUTO-RECOVERY 5',
        error: 'Document recovery failed',
        details: result.error
      });
    }
    
  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Document recovery failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recover document',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 6: Batch file recovery for multiple documents
router.post('/recover-batch', async (req: any, res: any) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: documentIds array required'
      });
    }
    
    console.log(`🔄 [AUTO-RECOVERY API] Starting batch recovery for ${documentIds.length} documents`);
    
    const result = await fileRecoveryService.recoverMultipleDocuments(documentIds);
    
    res.json({
      success: true,
      automation: 'AUTO-RECOVERY 6',
      message: 'Batch file recovery completed',
      batchRecovery: {
        totalAttempted: result.totalAttempted,
        successful: result.successful,
        failed: result.failed,
        successRate: `${Math.round((result.successful / result.totalAttempted) * 100)}%`,
        results: result.results,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Batch recovery failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run batch recovery',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY APPLICATION-LEVEL: Recover all documents for specific application
router.post('/recover-application/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    console.log(`🔄 [AUTO-RECOVERY API] Starting application-level recovery for: ${applicationId}`);
    
    // Get all documents for this application
    const docsQuery = 'SELECT id, name, applicationId FROM documents WHERE applicationId = $1';
    const docsResult = await pool.query(docsQuery, [applicationId]);
    const documents = docsResult.rows;
    
    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No documents found for this application',
        applicationId
      });
    }
    
    console.log(`📋 [AUTO-RECOVERY APP] Found ${documents.length} documents to process`);
    
    // Recover each document
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const doc of documents) {
      try {
        const result = await fileRecoveryService.recoverMissingDocument(doc.id);
        results.push({
          documentId: doc.id,
          fileName: doc.name,
          success: result.success,
          recoveryMethod: result.recoveryMethod,
          newPath: result.newPath,
          error: result.error
        });
        
        if (result.success) {
          successCount++;
          console.log(`✅ [AUTO-RECOVERY APP] Recovered: ${doc.name}`);
        } else {
          failureCount++;
          console.log(`❌ [AUTO-RECOVERY APP] Failed: ${doc.name} - ${result.error}`);
        }
      } catch (error: unknown) {
        failureCount++;
        results.push({
          documentId: doc.id,
          fileName: doc.name,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        console.log(`❌ [AUTO-RECOVERY APP] Error recovering ${doc.name}:`, error);
      }
    }
    
    const successRate = Math.round((successCount / documents.length) * 100);
    
    res.json({
      success: true,
      automation: 'AUTO-RECOVERY APPLICATION-LEVEL',
      message: `Application recovery completed: ${successCount} recovered, ${failureCount} failed`,
      applicationRecovery: {
        applicationId,
        totalDocuments: documents.length,
        recoveredCount: successCount,
        failedCount: failureCount,
        successRate: `${successRate}%`,
        results,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`🎯 [AUTO-RECOVERY APP] Application ${applicationId} complete: ${successRate}% success rate`);
    
  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Application recovery failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recover application documents',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// AUTO-RECOVERY 7: Get missing documents that need recovery
router.get('/missing-documents', async (req: any, res: any) => {
  try {
    console.log('🔄 [AUTO-RECOVERY API] Getting list of missing documents...');
    
    const result = await triggerAutoRecoveryFlow();
    
    res.json({
      success: true,
      automation: 'AUTO-RECOVERY 7',
      message: 'Missing documents identified',
      missingDocuments: {
        count: result.missingDetected,
        documents: result.alerts.map(alert => ({
          documentId: alert.documentId,
          fileName: alert.fileName,
          applicationId: alert.applicationId,
          businessName: alert.businessName,
          expectedPath: alert.expectedPath,
          canRecover: true
        })),
        lastChecked: new Date().toISOString()
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ [AUTO-RECOVERY API] Failed to get missing documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get missing documents',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;