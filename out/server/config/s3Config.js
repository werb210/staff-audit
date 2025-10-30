/**
 * 🚀 S3 CONFIGURATION FOR PRODUCTION DEPLOYMENT
 *
 * Centralized S3 configuration matching user requirements:
 * - Environment variables from Replit Secrets
 * - CORRECTED Production bucket: boreal-documents (FIXED July 26, 2025)
 * - Region: ca-central-1
 * - Server-side encryption: AES256
 *
 * Created: July 24, 2025
 * CRITICAL FIX: July 26, 2025 - Updated to use correct bucket name
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// S3 Configuration from environment variables
export const s3Config = {
    region: process.env.AWS_REGION || 'ca-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};
// S3 Client instance
const s3 = new S3Client(s3Config);
/**
 * Upload file buffer to S3 with server-side encryption
 * @param fileBuffer - File data as Buffer
 * @param fileName - Original file name
 * @param mimeType - MIME type of file
 * @param applicationId - Application ID for organization (optional)
 * @returns Promise<string> - S3 storage key
 */
export const uploadToS3 = async (fileBuffer, fileName, mimeType, applicationId) => {
    // Generate organized storage key
    const timestamp = Date.now();
    const storageKey = applicationId
        ? `${applicationId}/${fileName}`
        : `documents/${timestamp}-${fileName}`;
    // Use CORRECT bucket name - CRITICAL FIX July 26, 2025
    const bucketName = process.env.CORRECT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'boreal-documents';
    console.log("[DEBUG] Upload attempt to S3:", {
        bucket: bucketName,
        key: storageKey,
        size: fileBuffer.length,
        mime: mimeType,
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'MISSING',
        region: process.env.AWS_REGION || 'ca-central-1'
    });
    console.log(`[S3] Uploading file to ${storageKey} in ${bucketName}`);
    console.log(`[S3] File size: ${fileBuffer.length} bytes, Type: ${mimeType}`);
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: mimeType,
        ServerSideEncryption: "AES256",
        Metadata: {
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
            applicationId: applicationId || 'unknown'
        }
    });
    try {
        console.log("[DEBUG] Executing S3 PutObjectCommand...");
        const result = await s3.send(command);
        console.log("[DEBUG] S3 command result:", result);
        console.log(`[S3] Successfully uploaded ${fileName} to ${storageKey}`);
        return storageKey;
    }
    catch (err) {
        console.error("[S3 ERROR]", err);
        console.error("[S3 ERROR] Error code:", err.code);
        console.error("[S3 ERROR] Error name:", err.name);
        console.error("[S3 ERROR] Error message:", err.message);
        console.error("[S3 ERROR] Full error:", JSON.stringify(err, null, 2));
        throw err;
    }
};
// Export S3 client for external use
export const s3Client = s3;
// Export S3 configuration object for compatibility - CRITICAL FIX July 26, 2025
export const S3_CONFIG = {
    bucket: process.env.CORRECT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'boreal-documents',
    bucketName: process.env.CORRECT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'boreal-documents',
    region: process.env.AWS_REGION || 'ca-central-1',
    serverSideEncryption: 'AES256'
};
export { s3 };
export default s3Config;
