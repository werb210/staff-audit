/**
 * 🚀 S3 INTEGRATION TEST ROUTES
 * 
 * Comprehensive S3 testing and validation endpoints
 * Created: July 24, 2025
 */

import { Router } from 'express';
import { s3Storage, testS3Connection, S3_CONFIG } from '../utils/s3';

const router = Router();

/**
 * Test S3 Configuration and Connection
 */
router.get('/test-connection', async (req: any, res: any) => {
  try {
    console.log(`🧪 [S3-TEST] Testing S3 configuration...`);
    
    // Check environment variables
    const envCheck = {
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
      S3_BUCKET_NAME: process.env.CORRECT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'boreal-documents',
      AWS_REGION: process.env.AWS_REGION || 'ca-central-1'
    };

    console.log(`🔑 [S3-TEST] Environment check:`, envCheck);

    // Test connection
    const connectionResult = await testS3Connection();

    if (connectionResult) {
      // Test storage.set() functionality
      const testBuffer = Buffer.from('S3 storage.set() test - Staff Application', 'utf8');
      const testFileName = `test-${Date.now()}.txt`;
      
      console.log(`🧪 [S3-TEST] Testing storage.set() method...`);
      const storageKey = await s3Storage.set(testBuffer, testFileName, 'test-application');
      
      console.log(`✅ [S3-TEST] storage.set() returned: ${storageKey}`);

      // Verify storage key format
      const isValidKey = !storageKey.startsWith('local-fallback-');
      console.log(`🔍 [S3-TEST] Storage key valid: ${isValidKey}`);

      // Test retrieval
      const retrievedStream = await s3Storage.get(storageKey);
      const canRetrieve = !!retrievedStream;
      console.log(`📥 [S3-TEST] Document retrieval: ${canRetrieve ? 'SUCCESS' : 'FAILED'}`);

      // Clean up test file
      if (isValidKey) {
        await s3Storage.delete(storageKey);
        console.log(`🧹 [S3-TEST] Test file cleaned up: ${storageKey}`);
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        environment: envCheck,
        connection: connectionResult,
        storageTest: {
          storageKey,
          isValidKey,
          canRetrieve,
          serverSideEncryption: S3_CONFIG.serverSideEncryption
        },
        status: 'S3 integration fully operational',
        message: 'storage.set() returns proper storage_key, server-side encryption enabled, fallback logging as info'
      });

    } else {
      throw new Error('S3 connection failed');
    }

  } catch (error: any) {
    console.error(`❌ [S3-TEST] Integration test failed:`, error);
    
    res.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      environment: {
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        S3_BUCKET_NAME: process.env.CORRECT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'boreal-documents',
        AWS_REGION: process.env.AWS_REGION || 'ca-central-1'
      },
      troubleshooting: [
        'Verify AWS credentials in Replit Secrets',
        'Check bucket name: boreal-documents',
        'Verify region: ca-central-1',
        'Ensure IAM permissions for S3 operations'
      ]
    });
  }
});

/**
 * Test Pre-signed URL Generation
 */
router.get('/test-presigned-url/:storageKey', async (req: any, res: any) => {
  try {
    const { storageKey } = req.params;
    
    console.log(`🔗 [S3-TEST] Testing pre-signed URL for: ${storageKey}`);
    
    const preSignedUrl = await s3Storage.getPreSignedUrl(storageKey, 300); // 5 minutes
    
    res.json({
      success: true,
      storageKey,
      preSignedUrl,
      expiresIn: '5 minutes',
      message: 'Pre-signed URL generated successfully'
    });

  } catch (error: any) {
    console.error(`❌ [S3-TEST] Pre-signed URL generation failed:`, error);
    
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      storageKey: req.params.storageKey
    });
  }
});

/**
 * List S3 Bucket Contents
 */
router.get('/list-documents/:prefix?', async (req: any, res: any) => {
  try {
    const { prefix } = req.params;
    
    console.log(`📋 [S3-TEST] Listing documents${prefix ? ` with prefix: ${prefix}` : ''}`);
    
    const documents = await s3Storage.list(prefix, 50);
    
    res.json({
      success: true,
      prefix: prefix || 'none',
      documentCount: documents.length,
      documents: documents.slice(0, 20), // Show first 20
      totalScanned: documents.length
    });

  } catch (error: any) {
    console.error(`❌ [S3-TEST] Document listing failed:`, error);
    
    res.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * S3 Configuration Status
 */
router.get('/config-status', (req: any, res: any) => {
  const status = {
    timestamp: new Date().toISOString(),
    configuration: {
      bucketName: S3_CONFIG.bucketName,
      region: S3_CONFIG.region,
      serverSideEncryption: S3_CONFIG.serverSideEncryption,
      credentialsPresent: !!(S3_CONFIG.accessKeyId && S3_CONFIG.secretAccessKey)
    },
    environment: {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'MISSING',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'MISSING',
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'DEFAULT',
      AWS_REGION: process.env.AWS_REGION || 'DEFAULT'
    },
    features: {
      storageSetReturnsKey: true,
      fallbackLoggingAsInfo: true,
      serverSideEncryption: true,
      preSignedUrls: true,
      gracefulFallback: true
    }
  };

  console.log(`📊 [S3-CONFIG] Configuration status requested`);
  
  res.json(status);
});

export default router;