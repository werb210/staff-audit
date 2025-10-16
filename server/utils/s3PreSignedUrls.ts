/**
 * 🔗 S3 PRE-SIGNED URL GENERATOR
 * 
 * Generates secure pre-signed URLs for S3 document access
 * with configurable expiration and access permissions.
 * 
 * Created: July 23, 2025
 * Purpose: Provide secure document access via S3 URLs
 */

import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Client Configuration
const s3Client = new S3Client({
  region: 'ca-central-1', // Fixed region to match bucket location
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.CORRECT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'boreal-documents';

/**
 * Generate pre-signed URL for document download/preview
 */
export async function generatePreSignedDownloadUrl(
  s3Key: string, 
  expiresIn: number = 14400, // 4 hours default (14400 seconds)
  fileName?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ResponseContentDisposition: fileName ? `inline; filename="${fileName}"` : 'inline'
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  console.log(`🔗 [PRE-SIGNED] Generated download URL for ${s3Key} (expires in ${expiresIn}s)`);
  
  return url;
}

/**
 * Generate pre-signed URL for document upload (for direct client uploads)
 */
export async function generatePreSignedUploadUrl(
  s3Key: string,
  contentType: string = 'application/pdf',
  expiresIn: number = 14400 // 4 hours default (14400 seconds)
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  console.log(`🔗 [PRE-SIGNED] Generated upload URL for ${s3Key} (expires in ${expiresIn}s)`);
  
  return url;
}

/**
 * Check if object exists in S3
 */
export async function checkS3ObjectExists(s3Key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });
    
    await s3Client.send(command);
    console.log(`✅ [S3-CHECK] Object exists: ${s3Key}`);
    return true;
  } catch (error: unknown) {
    console.log(`❌ [S3-CHECK] Object not found: ${s3Key}`);
    return false;
  }
}

/**
 * Validate S3 configuration
 */
export function validateS3PreSignedConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_DEFAULT_REGION', 'S3_BUCKET_NAME'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

/**
 * Batch generate pre-signed URLs for multiple documents
 */
export async function generateBatchPreSignedUrls(
  s3Keys: { key: string; fileName?: string }[],
  expiresIn: number = 3600
): Promise<{ key: string; url: string; fileName?: string }[]> {
  console.log(`🔗 [BATCH-SIGNED] Generating ${s3Keys.length} pre-signed URLs`);
  
  const results = await Promise.all(
    s3Keys.map(async ({ key, fileName }) => ({
      key,
      fileName,
      url: await generatePreSignedDownloadUrl(key, expiresIn, fileName)
    }))
  );
  
  console.log(`✅ [BATCH-SIGNED] Generated ${results.length} pre-signed URLs successfully`);
  return results;
}