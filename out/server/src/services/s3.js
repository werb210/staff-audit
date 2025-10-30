// server/src/services/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const bucketName = process.env.AWS_S3_BUCKET_NAME;
/**
 * Upload a file buffer to S3.
 * @param key The destination key (path within the bucket).
 * @param body The file buffer.
 * @param contentType The MIME type.
 */
export async function uploadToS3(key, body, contentType) {
    await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
}
/**
 * Generate a signed URL for temporary access to an object.
 * @param key The object key.
 * @param expires Seconds until expiration.
 */
export async function getSignedUrlFor(key, expires = 3600) {
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn: expires });
}
/**
 * Delete an object from S3.
 * @param key The object key.
 */
export async function deleteFromS3(key) {
    await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
    }));
}
