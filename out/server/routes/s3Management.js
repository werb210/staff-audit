/**
 * S3 BUCKET MANAGEMENT ROUTES
 * Create and manage S3 buckets for document storage
 */
import { Router } from 'express';
import { s3, S3_CONFIG } from '../config/s3Config';
const router = Router();
/**
 * Create S3 bucket if it doesn't exist
 */
router.post('/create-bucket', async (req, res) => {
    console.log(`🪣 [S3 MANAGEMENT] Attempting to create bucket: ${S3_CONFIG.bucketName}`);
    try {
        // Check if bucket already exists
        try {
            await s3.headBucket({ Bucket: S3_CONFIG.bucketName }).promise();
            console.log(`✅ [S3 MANAGEMENT] Bucket already exists: ${S3_CONFIG.bucketName}`);
            return res.json({
                success: true,
                message: 'Bucket already exists',
                bucket: S3_CONFIG.bucketName,
                region: S3_CONFIG.region
            });
        }
        catch (headError) {
            if (headError.statusCode !== 404) {
                throw headError; // Re-throw non-404 errors
            }
            console.log(`📋 [S3 MANAGEMENT] Bucket doesn't exist, creating: ${S3_CONFIG.bucketName}`);
        }
        // Create the bucket
        const createParams = {
            Bucket: S3_CONFIG.bucketName,
            CreateBucketConfiguration: {
                LocationConstraint: S3_CONFIG.region
            }
        };
        await s3.createBucket(createParams).promise();
        console.log(`✅ [S3 MANAGEMENT] Bucket created successfully: ${S3_CONFIG.bucketName}`);
        // Set bucket versioning (optional but recommended)
        await s3.putBucketVersioning({
            Bucket: S3_CONFIG.bucketName,
            VersioningConfiguration: {
                Status: 'Enabled'
            }
        }).promise();
        console.log(`🔄 [S3 MANAGEMENT] Versioning enabled for bucket: ${S3_CONFIG.bucketName}`);
        res.json({
            success: true,
            message: 'Bucket created successfully',
            bucket: S3_CONFIG.bucketName,
            region: S3_CONFIG.region,
            versioning: 'enabled'
        });
    }
    catch (error) {
        console.error('❌ [S3 MANAGEMENT] Failed to create bucket:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create S3 bucket',
            details: error instanceof Error ? error.message : String(error),
            bucket: S3_CONFIG.bucketName,
            region: S3_CONFIG.region,
            guidance: error.code === 'InvalidAccessKeyId'
                ? 'AWS Access Key ID is invalid. Please verify your credentials.'
                : error.code === 'SignatureDoesNotMatch'
                    ? 'AWS Secret Access Key is invalid. Please verify your credentials.'
                    : error.code === 'AccessDenied'
                        ? 'AWS user lacks permission to create S3 buckets. Please check IAM permissions.'
                        : 'General S3 error. Please verify all credentials and permissions.'
        });
    }
});
/**
 * List all buckets in the account
 */
router.get('/list-buckets', async (req, res) => {
    console.log(`📋 [S3 MANAGEMENT] Listing all S3 buckets...`);
    try {
        const result = await s3.listBuckets().promise();
        console.log(`✅ [S3 MANAGEMENT] Found ${result.Buckets?.length || 0} buckets`);
        res.json({
            success: true,
            buckets: result.Buckets?.map(bucket => ({
                name: bucket.Name,
                creationDate: bucket.CreationDate
            })) || [],
            targetBucket: S3_CONFIG.bucketName,
            targetRegion: S3_CONFIG.region
        });
    }
    catch (error) {
        console.error('❌ [S3 MANAGEMENT] Failed to list buckets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list S3 buckets',
            details: error instanceof Error ? error.message : String(error),
            guidance: error.code === 'InvalidAccessKeyId'
                ? 'AWS Access Key ID is invalid. Please verify your credentials.'
                : error.code === 'SignatureDoesNotMatch'
                    ? 'AWS Secret Access Key is invalid. Please verify your credentials.'
                    : 'General S3 error. Please verify all credentials and permissions.'
        });
    }
});
export default router;
