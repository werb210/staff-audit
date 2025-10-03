import { Router } from 'express';
// REMOVED: Auth middleware import (authentication system deleted)
import { recoverMissingDocuments, previewRecovery } from '../utils/documentRecovery.js';

const router = Router();

// GET /api/document-recovery/preview - Preview how many documents can be recovered
router.get('/preview', async (req: any, res: any) => {
  try {
    console.log('🔍 Document recovery preview requested');
    
    const preview = await previewRecovery();
    
    res.json({
      success: true,
      preview: {
        totalMissing: preview.totalMissing,
        canRecover: preview.canRecover,
        cannotRecover: preview.totalMissing - preview.canRecover,
        recoveryRate: preview.totalMissing > 0 ? 
          Math.round((preview.canRecover / preview.totalMissing) * 100) : 0
      }
    });
  } catch (error: unknown) {
    console.error('❌ Document recovery preview failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview document recovery'
    });
  }
});

// POST /api/document-recovery/execute - Execute document recovery process
router.post('/execute', async (req: any, res: any) => {
  try {
    console.log('🚀 Document recovery execution requested by admin');
    
    const result = await recoverMissingDocuments();
    
    res.json({
      success: true,
      result: {
        totalProcessed: result.totalProcessed,
        filesRecovered: result.filesRecovered,
        stillMissing: result.stillMissing,
        recoveryRate: result.totalProcessed > 0 ? 
          Math.round((result.filesRecovered / result.totalProcessed) * 100) : 0,
        recoveredDocuments: result.recoveredDocuments,
        missingDocuments: result.missingDocuments
      }
    });
  } catch (error: unknown) {
    console.error('❌ Document recovery execution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute document recovery'
    });
  }
});

export default router;