/**
 * S3 Connection Test Route
 * Verifies S3 bucket connectivity and configuration
 */

import { Router, Request, Response } from 'express';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

const router = Router();

/**
 * GET /api/test-s3
 * Test S3 bucket connectivity
 */
router.get('/', async (req: Request, res: Response) => {
  console.log('🧪 [S3-TEST] Testing S3 bucket connectivity...');
  
  try {
    // Get environment variables - CRITICAL FIX July 26, 2025
    const bucketName = process.env.CORRECT_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'ca-central-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    console.log(`🪣 [S3-TEST] Bucket: ${bucketName}`);
    console.log(`🌍 [S3-TEST] Region: ${region}`);
    console.log(`🔑 [S3-TEST] Access Key: ${accessKeyId ? '***' + accessKeyId.slice(-4) : 'MISSING'}`);
    console.log(`🔐 [S3-TEST] Secret Key: ${secretAccessKey ? 'SET' : 'MISSING'}`);
    
    // Check required environment variables
    if (!bucketName) {
      return res.status(500).json({
        success: false,
        error: 'CORRECT_S3_BUCKET_NAME or AWS_S3_BUCKET_NAME not configured',
        bucket: bucketName,
        region: region
      });
    }
    
    if (!accessKeyId || !secretAccessKey) {
      return res.status(500).json({
        success: false,
        error: 'AWS credentials not configured',
        bucket: bucketName,
        region: region
      });
    }
    
    // Create S3 client
    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
    
    // Test bucket access
    console.log(`🔍 [S3-TEST] Testing bucket access for: ${bucketName}`);
    const headBucketCommand = new HeadBucketCommand({
      Bucket: bucketName
    });
    
    await s3Client.send(headBucketCommand);
    
    console.log(`✅ [S3-TEST] Bucket access successful!`);
    
    res.json({
      success: true,
      message: 'S3 bucket access confirmed',
      bucket: bucketName,
      region: region,
      credentials: 'configured'
    });
    
  } catch (error: any) {
    console.error(`❌ [S3-TEST] Error testing S3:`, error);
    
    // Handle specific AWS errors
    let errorMessage = 'Unknown S3 error';
    let errorCode = error.name || 'UnknownError';
    
    const bucketName = process.env.CORRECT_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
    
    if (error.name === 'NoSuchBucket') {
      errorMessage = `Bucket '${bucketName}' does not exist`;
    } else if (error.name === 'AccessDenied') {
      errorMessage = 'Access denied - check AWS credentials and permissions';
    } else if (error.name === 'InvalidBucketName') {
      errorMessage = 'Invalid bucket name format';
    } else if (error instanceof Error ? error.message : String(error)) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      errorCode: errorCode,
      bucket: bucketName,
      region: process.env.AWS_REGION || 'ca-central-1'
    });
  }
});

export default router;