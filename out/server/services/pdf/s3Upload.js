import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// Use existing S3 configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ca-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'boreal-documents';
export async function uploadPDFToS3(objectKey, pdfBuffer) {
    try {
        console.log(`☁️ [S3-UPLOAD] Uploading PDF to S3: ${objectKey}`);
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: objectKey,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            ServerSideEncryption: 'AES256',
            Metadata: {
                'generated-by': 'credit-summary-service',
                'generated-at': new Date().toISOString(),
            }
        });
        const result = await s3Client.send(command);
        console.log(`✅ [S3-UPLOAD] PDF uploaded successfully: ${objectKey}`);
        return objectKey;
    }
    catch (error) {
        console.error('S3 upload failed:', error);
        throw new Error('Failed to upload PDF to S3');
    }
}
export async function getPresignedDownloadUrl(objectKey, expiresIn = 3600) {
    try {
        console.log(`🔗 [S3-PRESIGN] Generating presigned URL for: ${objectKey}`);
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: objectKey,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn });
        console.log(`✅ [S3-PRESIGN] Presigned URL generated (expires in ${expiresIn}s)`);
        return url;
    }
    catch (error) {
        console.error('Presigned URL generation failed:', error);
        throw new Error('Failed to generate presigned URL');
    }
}
