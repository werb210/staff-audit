/**
 * 🔧 SYSTEM DIAGNOSTICS ROUTES
 * 
 * Comprehensive diagnostic testing for all system components
 * Including S3, database, authentication, and core functionality
 * 
 * Created: July 25, 2025
 */

import { Router, Request, Response } from 'express';
import { 
  testS3BucketAccess, 
  testS3Upload, 
  testS3PreSignedUrl, 
  runComprehensiveS3Diagnostic 
} from '../utils/s3Diagnostic';

const router = Router();

/**
 * GET /api/system/test-s3-basic
 * Basic S3 bucket access test
 */
router.get('/test-s3-basic', async (req: Request, res: Response) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME || 'boreal-documents';
    console.log(`🧪 [SYSTEM DIAGNOSTIC] Testing S3 basic access for bucket: ${bucket}`);
    
    const result = await testS3BucketAccess(bucket);
    
    res.json({
      ...result,
      configuration: {
        bucket,
        region: process.env.AWS_REGION || 'ca-central-1',
        hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      }
    });
  } catch (error: any) {
    console.error('❌ [SYSTEM DIAGNOSTIC] S3 basic test error:', error);
    res.status(500).json({
      success: false,
      test: 'bucket-access',
      error: 'Diagnostic test failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/system/test-s3-upload
 * S3 upload functionality test
 */
router.get('/test-s3-upload', async (req: Request, res: Response) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME || 'boreal-documents';
    console.log(`🧪 [SYSTEM DIAGNOSTIC] Testing S3 upload for bucket: ${bucket}`);
    
    const result = await testS3Upload(bucket);
    
    res.json({
      ...result,
      configuration: {
        bucket,
        region: process.env.AWS_REGION || 'ca-central-1',
        encryption: 'AES256'
      }
    });
  } catch (error: any) {
    console.error('❌ [SYSTEM DIAGNOSTIC] S3 upload test error:', error);
    res.status(500).json({
      success: false,
      test: 'upload',
      error: 'Upload test failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/system/test-s3-presigned
 * S3 pre-signed URL generation test
 */
router.get('/test-s3-presigned', async (req: Request, res: Response) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME || 'boreal-documents';
    const key = req.query.key as string;
    
    console.log(`🧪 [SYSTEM DIAGNOSTIC] Testing S3 pre-signed URL for bucket: ${bucket}`);
    
    const result = await testS3PreSignedUrl(bucket, key);
    
    res.json({
      ...result,
      configuration: {
        bucket,
        region: process.env.AWS_REGION || 'ca-central-1',
        defaultExpiration: '1 hour'
      }
    });
  } catch (error: any) {
    console.error('❌ [SYSTEM DIAGNOSTIC] S3 pre-signed URL test error:', error);
    res.status(500).json({
      success: false,
      test: 'presigned-url',
      error: 'Pre-signed URL test failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/system/test-s3-comprehensive
 * Complete S3 diagnostic suite
 */
router.get('/test-s3-comprehensive', async (req: Request, res: Response) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME || 'boreal-documents';
    console.log(`🔍 [SYSTEM DIAGNOSTIC] Running comprehensive S3 diagnostic for bucket: ${bucket}`);
    
    const diagnosticResult = await runComprehensiveS3Diagnostic(bucket);
    
    res.json({
      ...diagnosticResult,
      configuration: {
        bucket,
        region: process.env.AWS_REGION || 'ca-central-1',
        hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
        encryption: 'AES256'
      },
      recommendations: diagnosticResult.overall ? [
        "✅ S3 integration is fully operational",
        "✅ All upload and access functions working",
        "✅ System ready for production document management"
      ] : [
        "⚠️ S3 configuration issues detected",
        "🔧 Check AWS credentials and bucket permissions",
        "📋 Review failed tests in results array"
      ]
    });
  } catch (error: any) {
    console.error('❌ [SYSTEM DIAGNOSTIC] Comprehensive S3 test error:', error);
    res.status(500).json({
      overall: false,
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 1,
        timestamp: new Date().toISOString()
      },
      error: 'Comprehensive diagnostic failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/system/environment-info
 * System environment and configuration information
 */
router.get('/environment-info', async (req: Request, res: Response) => {
  try {
    console.log(`📋 [SYSTEM DIAGNOSTIC] Gathering environment information`);
    
    const envInfo = {
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development',
      s3_configuration: {
        region: process.env.AWS_REGION || 'ca-central-1',
        bucket: process.env.AWS_S3_BUCKET_NAME || 'boreal-documents',
        has_access_key: !!process.env.AWS_ACCESS_KEY_ID,
        has_secret_key: !!process.env.AWS_SECRET_ACCESS_KEY,
        access_key_preview: process.env.AWS_ACCESS_KEY_ID ? 
          `${process.env.AWS_ACCESS_KEY_ID.substring(0, 4)}...${process.env.AWS_ACCESS_KEY_ID.slice(-4)}` : 
          'Not configured'
      },
      database_configuration: {
        url_configured: !!process.env.DATABASE_URL,
        url_preview: process.env.DATABASE_URL ? 
          `${process.env.DATABASE_URL.substring(0, 20)}...` : 
          'Not configured'
      },
      jwt_configuration: {
        secret_configured: !!process.env.JWT_SECRET,
        secret_length: process.env.JWT_SECRET?.length || 0
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      environment: envInfo
    });
  } catch (error: any) {
    console.error('❌ [SYSTEM DIAGNOSTIC] Environment info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to gather environment information',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;