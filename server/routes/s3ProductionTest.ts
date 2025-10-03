/**
 * 🚀 S3 PRODUCTION TESTING ROUTES
 * 
 * Test endpoints to verify S3 integration works correctly
 * with production bucket configuration
 * 
 * Created: July 24, 2025
 */

import { Router } from 'express';
import multer from 'multer';
import { uploadDocumentToS3, testS3Connection } from '../utils/pureS3Upload';

const router = Router();

// Memory storage for test uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for testing
});

// Test S3 configuration
router.get('/test-config', async (req: any, res: any) => {
  try {
    const config = await testS3Connection();
    
    console.log(`[S3-TEST] Configuration check requested`);
    console.log(`[S3-TEST] Bucket: ${config.bucket}`);
    console.log(`[S3-TEST] Region: ${config.region}`);
    console.log(`[S3-TEST] Credentials present: ${config.credentials}`);
    
    res.json({
      success: true,
      configuration: config,
      environment: {
        S3_BUCKET_NAME: process.env.CORRECT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME,
        AWS_REGION: process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'Missing'
      }
    });
  } catch (error: unknown) {
    console.error(`[S3-TEST] Configuration check failed:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Test file upload to S3
router.post('/test-upload', upload.single('document'), async (req: any, res: any) => {
  try {
    const file = req.file;
    const applicationId = req.body.applicationId || 'test-app-123';
    const documentType = req.body.documentType || 'test_document';

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    console.log(`[S3-TEST] Test upload started`);
    console.log(`[S3-TEST] File: ${file.originalname}`);
    console.log(`[S3-TEST] Size: ${file.size} bytes`);
    console.log(`[S3-TEST] Application: ${applicationId}`);

    const result = await uploadDocumentToS3({
      applicationId,
      fileBuffer: file.buffer,
      fileName: file.originalname,
      documentType,
      mimeType: file.mimetype
    });

    console.log(`[S3-TEST] Upload completed successfully`);
    console.log(`[S3-TEST] Document ID: ${result.documentId}`);
    console.log(`[S3-TEST] Storage Key: ${result.storageKey}`);

    res.json({
      success: true,
      message: 'Test upload completed successfully',
      result: {
        documentId: result.documentId,
        storageKey: result.storageKey,
        fileName: file.originalname,
        fileSize: file.size,
        applicationId
      }
    });

  } catch (error: unknown) {
    console.error(`[S3-TEST] Test upload failed:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
      details: 'S3 test upload failed - ensure bucket exists and credentials are correct'
    });
  }
});

export default router;