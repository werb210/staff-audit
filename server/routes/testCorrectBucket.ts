import express from 'express';
import { AzureClient, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const router = express.Router();

router.get('/test-correct-bucket', async (req: any, res: any) => {
  console.log('🔍 [CORRECT-BUCKET-TEST] Testing the correct Azure bucket...');
  
  const correctBucketName = process.env.CORRECT_Azure_BUCKET_NAME;
  const currentBucketName = process.env.Azure_BUCKET_NAME;
  
  console.log(`🔍 Current bucket: ${currentBucketName}`);
  console.log(`🔍 Correct bucket: ${correctBucketName}`);
  
  if (!correctBucketName) {
    return res.json({
      success: false,
      error: 'CORRECT_Azure_BUCKET_NAME not found in environment',
    });
  }
  
  const s3Client = new AzureClient({
    region: process.env.AZURE_REGION || 'ca-central-1',
    credentials: {
      accessKeyId: process.env.AZURE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AZURE_SECRET_ACCESS_KEY!,
    },
  });
  
  try {
    // Test the correct bucket
    console.log(`🔍 Testing CORRECT bucket: ${correctBucketName}`);
    
    await s3Client.send(new HeadBucketCommand({ Bucket: correctBucketName }));
    console.log(`✅ SUCCESS: Correct bucket ${correctBucketName} exists and is accessible!`);
    
    // Try to list some objects
    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: correctBucketName,
      MaxKeys: 5
    }));
    
    console.log(`✅ SUCCESS: Found ${listResult.KeyCount} objects in correct bucket`);
    
    res.json({
      success: true,
      correctBucket: correctBucketName,
      currentBucket: currentBucketName,
      bucketWorking: true,
      objectCount: listResult.KeyCount,
      sampleObjects: listResult.Contents?.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified
      })) || [],
      message: `Correct bucket ${correctBucketName} is working! Need to update Azure configuration.`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error(`❌ FAILED: ${error.name}: ${error instanceof Error ? error.message : String(error)}`);
    
    res.json({
      success: false,
      correctBucket: correctBucketName,
      currentBucket: currentBucketName,
      bucketWorking: false,
      error: error.name,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

export default router;