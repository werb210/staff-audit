import express from 'express';
import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const router = express.Router();

router.get('/test-bucket-exists', async (req: any, res: any) => {
  console.log('🔍 [QUICK-S3-TEST] Testing if boreal-production-uploads bucket exists...');
  
  const bucketName = process.env.S3_BUCKET_NAME || 'boreal-production-uploads';
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ca-central-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  
  try {
    // Test bucket existence
    console.log(`🔍 Testing bucket: ${bucketName} in region: ${process.env.AWS_REGION || 'ca-central-1'}`);
    
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`✅ SUCCESS: Bucket ${bucketName} exists and is accessible!`);
    
    // Try to list some objects
    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 3
    }));
    
    console.log(`✅ SUCCESS: Found ${listResult.KeyCount} objects in bucket`);
    
    res.json({
      success: true,
      bucketName,
      exists: true,
      accessible: true,
      objectCount: listResult.KeyCount,
      sampleObjects: listResult.Contents?.map(obj => obj.Key) || [],
      message: `Bucket ${bucketName} is working correctly!`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error(`❌ FAILED: ${error.name}: ${error instanceof Error ? error.message : String(error)}`);
    
    let suggestion = '';
    if (error.name === 'NoSuchBucket') {
      suggestion = `Bucket "${bucketName}" does not exist in AWS. Please create it or check the bucket name.`;
    } else if (error.name === 'AccessDenied') {
      suggestion = 'Access denied. Check IAM permissions for your AWS credentials.';
    } else if (error.name === 'InvalidAccessKeyId') {
      suggestion = 'Invalid AWS Access Key ID. Check your AWS credentials.';
    } else {
      suggestion = `AWS error: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    res.json({
      success: false,
      bucketName,
      exists: false,
      accessible: false,
      error: error.name,
      message: error instanceof Error ? error.message : String(error),
      suggestion,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;