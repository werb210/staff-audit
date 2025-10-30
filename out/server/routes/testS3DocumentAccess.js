import express from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const router = express.Router();
router.get('/test-document-access', async (req, res) => {
    console.log('🔍 [DOCUMENT-ACCESS-TEST] Testing actual document access with correct bucket...');
    const correctBucketName = process.env.CORRECT_S3_BUCKET_NAME || 'boreal-documents';
    const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ca-central-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
    try {
        // Get a real document from the database to test
        const { sql } = await import('drizzle-orm');
        const { db } = await import('../db');
        const result = await db.execute(sql `
      SELECT storage_key, name, id 
      FROM documents 
      WHERE storage_key IS NOT NULL 
      LIMIT 1
    `);
        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: 'No documents with storage_key found in database',
                bucketName: correctBucketName
            });
        }
        const document = result.rows[0];
        console.log(`🔍 Testing document: ${document.name} with storage key: ${document.storage_key}`);
        // Generate pre-signed URL for the document
        const getObjectCommand = new GetObjectCommand({
            Bucket: correctBucketName,
            Key: document.storage_key
        });
        const preSignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
            expiresIn: 3600 // 1 hour
        });
        console.log(`✅ Pre-signed URL generated successfully`);
        console.log(`🔗 URL: ${preSignedUrl.substring(0, 100)}...`);
        // Test if the object actually exists by trying to get object metadata
        const headResult = await s3Client.send(new GetObjectCommand({
            Bucket: correctBucketName,
            Key: document.storage_key
        }));
        res.json({
            success: true,
            message: 'Document access test successful!',
            document: {
                id: document.id,
                fileName: document.name,
                storageKey: document.storage_key
            },
            s3: {
                bucketName: correctBucketName,
                accessible: true,
                preSignedUrl: preSignedUrl,
                contentLength: headResult.ContentLength,
                contentType: headResult.ContentType,
                lastModified: headResult.LastModified
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error(`❌ Document access test failed: ${error.name}: ${error instanceof Error ? error.message : String(error)}`);
        res.json({
            success: false,
            error: error.name,
            message: error instanceof Error ? error.message : String(error),
            bucketName: correctBucketName,
            timestamp: new Date().toISOString()
        });
    }
});
export default router;
