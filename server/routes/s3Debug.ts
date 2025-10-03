/**
 * 🔍 S3 DEBUG ENDPOINTS
 * 
 * Comprehensive S3 testing and debugging routes
 */

import express from 'express';
import { s3DebugService } from '../utils/s3DebugService';

const router = express.Router();

/**
 * Test S3 configuration and connectivity
 */
router.get('/test', async (req: any, res: any) => {
  try {
    console.log(`🔍 [S3-DEBUG-API] Running S3 configuration test...`);
    
    const diagnostic = await s3DebugService.runComprehensiveDiagnostic();
    
    res.json({
      success: diagnostic.success,
      timestamp: new Date().toISOString(),
      configuration: {
        bucketName: diagnostic.bucketName,
        region: diagnostic.region,
        credentialsPresent: diagnostic.credentialsPresent
      },
      tests: {
        bucketAccessible: diagnostic.bucketAccessible,
        directS3Url: diagnostic.directS3Url
      },
      troubleshooting: diagnostic.troubleshooting,
      error: diagnostic.error ? {
        code: diagnostic.awsErrorCode,
        message: diagnostic.awsErrorMessage
      } : null
    });
  } catch (error: any) {
    console.error(`❌ [S3-DEBUG-API] Error running S3 test:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to run S3 diagnostic',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Test specific document access
 */
router.get('/test-document/:documentId', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    console.log(`🔍 [S3-DEBUG-API] Testing document access: ${documentId}`);
    
    // Get document from database
    const { db } = await import('../db');
    const { documents } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const document = await db.select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    
    if (!document[0]) {
      return res.status(404).json({
        success: false,
        error: 'Document not found in database',
        documentId
      });
    }
    
    const doc = document[0];
    const objectKey = doc.storage_key || doc.storageKey || doc.objectStorageKey;
    
    if (!objectKey) {
      return res.json({
        success: false,
        documentId,
        fileName: doc.fileName,
        error: 'No S3 storage key found for document',
        troubleshooting: [
          'Document exists in database but has no S3 storage key',
          'Check storage_key, storageKey, or objectStorageKey fields',
          'Document may have been uploaded to local storage only'
        ]
      });
    }
    
    console.log(`🔍 [S3-DEBUG-API] Found document with storage key: ${objectKey}`);
    
    // Run diagnostic on specific object
    const diagnostic = await s3DebugService.runComprehensiveDiagnostic(objectKey);
    
    res.json({
      success: diagnostic.success,
      timestamp: new Date().toISOString(),
      document: {
        id: documentId,
        fileName: doc.fileName,
        storageKey: objectKey,
        fileSize: doc.fileSize
      },
      configuration: {
        bucketName: diagnostic.bucketName,
        region: diagnostic.region
      },
      tests: {
        bucketAccessible: diagnostic.bucketAccessible,
        objectExists: diagnostic.objectExists,
        preSignedUrlGenerated: !!diagnostic.preSignedUrl
      },
      urls: {
        preSignedUrl: diagnostic.preSignedUrl,
        directS3Url: diagnostic.directS3Url
      },
      troubleshooting: diagnostic.troubleshooting,
      error: diagnostic.error ? {
        code: diagnostic.awsErrorCode,
        message: diagnostic.awsErrorMessage
      } : null
    });
    
  } catch (error: any) {
    console.error(`❌ [S3-DEBUG-API] Error testing document:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to test document access',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Test bucket public URL accessibility
 */
router.get('/test-bucket-url', async (req: any, res: any) => {
  try {
    console.log(`🔍 [S3-DEBUG-API] Testing bucket public URL accessibility...`);
    
    const bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'boreal-documents';
    const region = process.env.S3_REGION || process.env.AWS_DEFAULT_REGION || 'ca-central-1';
    
    const bucketUrl = `https://${bucketName}.s3.${region}.amazonaws.com/`;
    
    // Test bucket URL accessibility (should return 403 for private bucket)
    const fetch = (await import('node-fetch')).default;
    
    try {
      const response = await fetch(bucketUrl, { method: 'HEAD' });
      console.log(`🔍 [S3-DEBUG-API] Bucket URL response: ${response.status}`);
      
      res.json({
        success: true,
        bucketUrl,
        httpStatus: response.status,
        accessible: response.status !== 403,
        message: response.status === 403 
          ? 'Bucket is correctly configured as private (403 Forbidden)'
          : `Bucket returned HTTP ${response.status}`,
        troubleshooting: response.status === 403 ? [
          '✅ Bucket is private (secure configuration)',
          'Documents should be accessed via pre-signed URLs only'
        ] : [
          `Bucket returned HTTP ${response.status}`,
          response.status === 404 ? 'Bucket may not exist' : 'Check bucket configuration'
        ]
      });
    } catch (fetchError: any) {
      console.error(`❌ [S3-DEBUG-API] Bucket URL test failed:`, fetchError.message);
      
      res.json({
        success: false,
        bucketUrl,
        error: fetchError.message,
        troubleshooting: [
          'Could not reach bucket URL',
          'Check bucket name and region configuration',
          'Verify bucket exists in AWS console'
        ]
      });
    }
    
  } catch (error: any) {
    console.error(`❌ [S3-DEBUG-API] Error testing bucket URL:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to test bucket URL',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;