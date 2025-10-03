/**
 * 🚨 FILE VERIFICATION API ENDPOINTS
 * Provides API access to file verification services for staff monitoring
 */

import { Router } from 'express';
import { verifyUploadedFiles, verifySingleDocument } from '../utils/fileVerificationService.js';
import { hybridAuth } from '../middleware/hybridAuth.js';

const router = Router();

// Apply authentication to all verification endpoints
router.use(hybridAuth);

/**
 * GET /api/file-verification/status
 * Returns comprehensive file verification status
 */
router.get('/status', async (req: any, res: any) => {
  try {
    console.log(`🔍 [FILE VERIFICATION API] Starting verification audit...`);
    
    const results = await verifyUploadedFiles();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: results.total,
        valid: results.valid,
        missing: results.missing,
        corrupted: results.corrupted,
        healthScore: results.total > 0 ? Math.round((results.valid / results.total) * 100) : 100
      },
      issues: results.issues,
      status: results.issues.length === 0 ? 'healthy' : 'issues_detected'
    });
    
  } catch (error: any) {
    console.error(`❌ [FILE VERIFICATION API] Status check failed:`, error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'File verification failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/file-verification/document/:id
 * Verifies a single document
 */
router.get('/document/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [FILE VERIFICATION API] Verifying document: ${id}`);
    
    const result = await verifySingleDocument(id);
    
    res.json({
      success: true,
      documentId: id,
      timestamp: new Date().toISOString(),
      verification: result
    });
    
  } catch (error: any) {
    console.error(`❌ [FILE VERIFICATION API] Single document verification failed:`, error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'Document verification failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/file-verification/repair
 * Attempts to repair file integrity issues (future implementation)
 */
router.post('/repair', async (req: any, res: any) => {
  // Placeholder for future repair functionality
  res.json({
    success: false,
    message: 'File repair functionality not yet implemented',
    recommendation: 'Use document re-upload functionality for corrupted files'
  });
});

export { router as fileVerificationRouter };