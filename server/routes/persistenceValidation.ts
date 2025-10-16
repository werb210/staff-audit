/**
 * 🔍 PHASE 2: PERSISTENCE VALIDATION ROUTES
 * Enhanced upload system with dual storage and validation
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { enhancedUploadHandler } from '../utils/enhancedUploadHandler';
import { alertSystem } from '../utils/alertSystem';

const router = Router();
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
  })
});

// Enhanced upload endpoint with persistence validation
router.post('/enhanced-upload', upload.single('file'), async (req: any, res: any) => {
  try {
    const { applicationId, documentType, uploadedBy } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    console.log(`🚀 [ENHANCED-UPLOAD] Starting enhanced upload for: ${file.originalname}`);

    // Use enhanced upload handler
    const result = await enhancedUploadHandler({
      file,
      applicationId,
      documentType: documentType || 'other',
      uploadedBy: uploadedBy || 'system'
    });

    if (!result.success) {
      // Trigger alert for upload failure
      await alertSystem.triggerAlert({
        type: 'upload_failure',
        severity: 'high',
        message: `Enhanced upload failed: ${result.error}`,
        details: {
          fileName: file.originalname,
          applicationId,
          error: result.error
        }
      });

      return res.status(500).json(result);
    }

    console.log(`✅ [ENHANCED-UPLOAD] Upload successful with validation: ${file.originalname}`);

    res.json({
      success: true,
      message: 'File uploaded and validated successfully',
      documentId: result.documentId,
      validation: result.validationDetails,
      backupStatus: result.backupSuccess ? 'success' : 'failed',
      checksumVerified: result.validationDetails?.checksumVerified || false
    });

  } catch (error: unknown) {
    console.error('❌ [ENHANCED-UPLOAD] Upload error:', error);
    
    await alertSystem.triggerAlert({
      type: 'system_error',
      severity: 'critical',
      message: 'Enhanced upload system error',
      details: {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      }
    });

    res.status(500).json({
      success: false,
      error: 'Enhanced upload failed',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Get alert status
router.get('/alert-status', async (req: any, res: any) => {
  try {
    const status = await alertSystem.getSystemStatus();
    res.json(status);
  } catch (error: unknown) {
    console.error('❌ [ALERTS] Error getting alert status:', error);
    res.status(500).json({ error: 'Failed to get alert status' });
  }
});

// Get recent alerts
router.get('/recent-alerts', async (req: any, res: any) => {
  try {
    const alerts = await alertSystem.getRecentAlerts();
    res.json({ success: true, alerts });
  } catch (error: unknown) {
    console.error('❌ [ALERTS] Error getting recent alerts:', error);
    res.status(500).json({ error: 'Failed to get recent alerts' });
  }
});

// Clear alerts
router.post('/clear-alerts', async (req: any, res: any) => {
  try {
    await alertSystem.clearAlerts();
    res.json({ success: true, message: 'Alerts cleared' });
  } catch (error: unknown) {
    console.error('❌ [ALERTS] Error clearing alerts:', error);
    res.status(500).json({ error: 'Failed to clear alerts' });
  }
});

export default router;