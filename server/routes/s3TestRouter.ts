import { Router } from 'express';
import { testS3Credentials } from '../utils/s3Test';

const router = Router();

// GET /api/s3/test - Test S3 credentials and permissions
router.get('/test', async (req: any, res: any) => {
  try {
    console.log(`🧪 [S3 TEST API] Testing S3 credentials...`);
    
    const result = await testS3Credentials();
    
    if (result.success) {
      console.log(`✅ [S3 TEST API] All tests passed`);
      res.json({
        success: true,
        message: result.message,
        bucket: result.bucket,
        region: result.region,
        tests: result.tests,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`❌ [S3 TEST API] Tests failed:`, result.error);
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
        guidance: result.guidance,
        bucket: result.bucket,
        region: result.region,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error: any) {
    console.error(`❌ [S3 TEST API] Unexpected error:`, error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'Unexpected error during S3 testing',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/s3/status - Quick S3 connection status
router.get('/status', async (req: any, res: any) => {
  try {
    const { testS3Connection } = await import('../config/s3Config');
    const isConnected = await testS3Connection();
    
    res.json({
      connected: isConnected,
      bucket: process.env.S3_BUCKET_NAME,
      region: process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

export default router;