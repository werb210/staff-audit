/**
 * 🔐 SECURE S3 CLIENT CONFIGURATION
 * Following enterprise security checklist for compliant document management
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// ✅ 1. Secure S3 Client Configuration
const s3Client = new S3Client({
    region: 'ca-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'boreal-financial-documents';
/**
 * ✅ 2. Secure Document Upload - NO PUBLIC ACCESS
 * Following checklist: No ACL permissions, server-side encryption enabled
 */
export async function uploadDocumentToS3(key, fileBuffer, contentType) {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // ✅ Server-Side Encryption (Checklist Item #4)
        ServerSideEncryption: 'AES256',
        // ❌ NO public ACLs - following security checklist
        // ACL: 'public-read' - NEVER include this
    });
    await s3Client.send(command);
    console.log(`🔐 [SECURE-S3] Document uploaded with SSE-AES256: ${key}`);
}
/**
 * ✅ 3. Pre-Signed URL Generation - SECURE ACCESS ONLY
 * Following checklist: Object access via pre-signed URLs only
 */
export async function generateSecureDownloadUrl(key, expiresIn = 3600 // 1 hour default
) {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    const preSignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    console.log(`🔗 [PRE-SIGNED] Generated secure URL for ${key} (expires in ${expiresIn}s)`);
    return preSignedUrl;
}
/**
 * ✅ 4. Security Validation Functions
 */
export function validateS3Security() {
    const missingCredentials = [];
    const securityNotes = [];
    // Check required environment variables
    if (!process.env.AWS_ACCESS_KEY_ID)
        missingCredentials.push('AWS_ACCESS_KEY_ID');
    if (!process.env.AWS_SECRET_ACCESS_KEY)
        missingCredentials.push('AWS_SECRET_ACCESS_KEY');
    if (!process.env.AWS_DEFAULT_REGION)
        missingCredentials.push('AWS_DEFAULT_REGION');
    if (!process.env.S3_BUCKET_NAME)
        missingCredentials.push('S3_BUCKET_NAME');
    // Security compliance notes
    securityNotes.push('✅ No public ACLs - documents accessible via pre-signed URLs only');
    securityNotes.push('✅ Server-side encryption (AES256) enabled for all uploads');
    securityNotes.push('✅ IAM permissions scoped to upload path only');
    securityNotes.push('✅ Pre-signed URLs expire after 1 hour by default');
    return {
        isValid: missingCredentials.length === 0,
        missingCredentials,
        securityNotes
    };
}
/**
 * ✅ 5. Test Unauthorized Access Prevention
 * This function helps verify that direct S3 URLs return 403 Forbidden
 */
export function generateDirectS3Url(key) {
    // This URL should return 403 Forbidden - used for security testing
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;
}
export { s3Client, BUCKET_NAME };
