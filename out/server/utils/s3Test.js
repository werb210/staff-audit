import { s3Client, S3_CONFIG } from '../config/s3Config';
import { ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
export async function testS3Credentials() {
    console.log(`🧪 [S3 TEST] Testing AWS credentials...`);
    console.log(`🧪 [S3 TEST] Bucket: ${S3_CONFIG.bucketName}`);
    console.log(`🧪 [S3 TEST] Region: ${S3_CONFIG.region}`);
    // First, check if credentials are even provided
    console.log(`🔑 [S3 TEST] Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? 'PROVIDED' : 'MISSING'}`);
    console.log(`🔑 [S3 TEST] Secret Access Key: ${process.env.AWS_SECRET_ACCESS_KEY ? 'PROVIDED' : 'MISSING'}`);
    console.log(`🔑 [S3 TEST] Correct Bucket Name: ${process.env.CORRECT_S3_BUCKET_NAME ? 'PROVIDED' : 'MISSING'}`);
    console.log(`🔑 [S3 TEST] Legacy Bucket Name: ${process.env.S3_BUCKET_NAME ? 'PROVIDED' : 'MISSING'}`);
    try {
        // Test 1: Verify credentials by listing bucket
        console.log(`📋 [S3 TEST] Testing bucket access...`);
        // Test bucket existence and access using listObjectsV2 - AWS SDK v3 syntax
        await s3Client.send(new ListObjectsV2Command({
            Bucket: S3_CONFIG.bucketName,
            MaxKeys: 1
        }));
        console.log(`✅ [S3 TEST] Bucket access successful`);
        // Test 2: List bucket contents (to verify permissions)
        console.log(`📂 [S3 TEST] Testing bucket permissions...`);
        const listResult = await s3Client.send(new ListObjectsV2Command({
            Bucket: S3_CONFIG.bucketName,
            MaxKeys: 5
        }));
        console.log(`✅ [S3 TEST] Bucket contains ${listResult.KeyCount} objects`);
        // Test 3: Upload a small test file
        console.log(`📤 [S3 TEST] Testing upload permissions...`);
        const testContent = Buffer.from('S3 test file from Staff Application');
        const testKey = 'test/connection-test.txt';
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_CONFIG.bucketName,
            Key: testKey,
            Body: testContent,
            ContentType: 'text/plain'
        }));
        console.log(`✅ [S3 TEST] Test upload successful: ${testKey}`);
        // Test 4: Download the test file
        console.log(`📥 [S3 TEST] Testing download permissions...`);
        const downloadResult = await s3Client.send(new GetObjectCommand({
            Bucket: S3_CONFIG.bucketName,
            Key: testKey
        }));
        console.log(`✅ [S3 TEST] Test download successful`);
        // Test 5: Delete the test file
        console.log(`🗑️ [S3 TEST] Cleaning up test file...`);
        await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_CONFIG.bucketName,
            Key: testKey
        }));
        console.log(`✅ [S3 TEST] Test cleanup successful`);
        return {
            success: true,
            message: 'All S3 credentials and permissions verified successfully',
            bucket: S3_CONFIG.bucketName,
            region: S3_CONFIG.region,
            tests: [
                'Bucket access ✅',
                'List permissions ✅',
                'Upload permissions ✅',
                'Download permissions ✅',
                'Delete permissions ✅'
            ]
        };
    }
    catch (error) {
        console.error(`❌ [S3 TEST] Failed:`, error instanceof Error ? error.message : String(error));
        // Provide specific error guidance
        let guidance = '';
        if (error.code === 'NoSuchBucket') {
            guidance = 'Bucket does not exist. Please check S3_BUCKET_NAME.';
        }
        else if (error.code === 'InvalidAccessKeyId') {
            guidance = 'Invalid Access Key ID. Please check AWS_ACCESS_KEY_ID.';
        }
        else if (error.code === 'SignatureDoesNotMatch') {
            guidance = 'Invalid Secret Access Key. Please check AWS_SECRET_ACCESS_KEY.';
        }
        else if (error.code === 'AccessDenied') {
            guidance = 'Access denied. Please check IAM permissions for the user.';
        }
        else if (error.code === 'InvalidBucketName') {
            guidance = 'Invalid bucket name format. Please check S3_BUCKET_NAME.';
        }
        else {
            guidance = 'General S3 error. Please verify all credentials and permissions.';
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            code: error.code,
            guidance,
            bucket: S3_CONFIG.bucketName,
            region: S3_CONFIG.region
        };
    }
}
