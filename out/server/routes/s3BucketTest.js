import express from 'express';
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
const router = express.Router();
// Test different bucket names to find the correct one
const POSSIBLE_BUCKETS = [
    'boreal-production-uploads',
    'boreal-documents',
    'boreal-uploads',
    'boreal-staff-documents',
    process.env.S3_BUCKET_NAME
].filter(Boolean);
router.get('/test-buckets', async (req, res) => {
    console.log('🔍 [BUCKET-TEST] Testing multiple S3 bucket configurations...');
    const results = [];
    const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ca-central-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
    for (const bucketName of POSSIBLE_BUCKETS) {
        console.log(`🔍 Testing bucket: ${bucketName}`);
        try {
            // Test 1: Check if bucket exists
            await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
            console.log(`✅ Bucket exists: ${bucketName}`);
            // Test 2: List objects to verify access
            const listResult = await s3Client.send(new ListObjectsV2Command({
                Bucket: bucketName,
                MaxKeys: 5
            }));
            console.log(`✅ Bucket accessible: ${bucketName} (${listResult.KeyCount} objects)`);
            results.push({
                bucketName,
                exists: true,
                accessible: true,
                objectCount: listResult.KeyCount,
                sampleObjects: listResult.Contents?.slice(0, 3).map(obj => ({
                    key: obj.Key,
                    size: obj.Size,
                    lastModified: obj.LastModified
                })) || [],
                status: 'SUCCESS'
            });
        }
        catch (error) {
            console.log(`❌ Bucket failed: ${bucketName} - ${error.name}: ${error instanceof Error ? error.message : String(error)}`);
            results.push({
                bucketName,
                exists: false,
                accessible: false,
                error: error.name,
                message: error instanceof Error ? error.message : String(error),
                status: 'FAILED'
            });
        }
    }
    // Find working buckets
    const workingBuckets = results.filter(r => r.status === 'SUCCESS');
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        environment: {
            AWS_REGION: process.env.AWS_REGION,
            S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
            AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'PROVIDED' : 'MISSING'
        },
        testedBuckets: POSSIBLE_BUCKETS.length,
        workingBuckets: workingBuckets.length,
        results,
        recommendation: workingBuckets.length > 0 ?
            `Use bucket: ${workingBuckets[0].bucketName}` :
            'No working buckets found - check AWS configuration'
    });
});
export default router;
