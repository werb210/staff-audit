/**
 * 🚀 S3 PRODUCTION UTILITY FOR STAFF APPLICATION
 * 
 * Production-ready S3 integration with:
 * - Server-side encryption (SSE-S3/SSE-KMS)
 * - storage.set() returns storage_key
 * - Graceful fallback logging as info (not warn)
 * - Complete AWS SDK v3 integration
 * 
 * Created: July 24, 2025
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// S3 Configuration from environment
const S3_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION || 'ca-central-1',
  bucketName: process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'boreal-documents',
  serverSideEncryption: process.env.S3_SERVER_SIDE_ENCRYPTION || 'AES256'
};

// Initialize S3 Client
const s3Client = new S3Client({
  region: S3_CONFIG.region,
  credentials: {
    accessKeyId: S3_CONFIG.accessKeyId,
    secretAccessKey: S3_CONFIG.secretAccessKey,
  },
});

console.log(`🚀 [S3] Production client initialized:`);
console.log(`   Bucket: ${S3_CONFIG.bucketName}`);
console.log(`   Region: ${S3_CONFIG.region}`);
console.log(`   Encryption: ${S3_CONFIG.serverSideEncryption}`);
console.log(`   Credentials: ${S3_CONFIG.accessKeyId ? 'PROVIDED' : 'MISSING'}`);

/**
 * Storage interface implementation
 * Ensures storage.set() returns storage_key as required
 */
export class S3Storage {
  /**
   * Upload document to S3 and return storage_key
   * @param buffer - File buffer to upload
   * @param fileName - Original file name
   * @param applicationId - Application ID for organization
   * @returns Promise<string> - Storage key for database storage
   */
  async set(buffer: Buffer, fileName: string, applicationId?: string): Promise<string> {
    try {
      // Generate storage key with application organization
      const timestamp = Date.now();
      const storageKey = applicationId 
        ? `${applicationId}/${fileName}`
        : `documents/${timestamp}-${fileName}`;

      console.log("[DEBUG] Upload attempt to S3:", {
        bucket: S3_CONFIG.bucketName,
        key: storageKey,
        size: buffer.length,
        mime: this.getContentType(fileName),
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'MISSING',
        region: process.env.AWS_REGION || 'ca-central-1'
      });

      console.log(`☁️ [S3-STORAGE] Uploading: ${fileName} -> ${storageKey}`);
      console.log(`☁️ [S3-STORAGE] Buffer size: ${buffer.length} bytes`);

      // Upload to S3 with server-side encryption
      const uploadCommand = new PutObjectCommand({
        Bucket: S3_CONFIG.bucketName,
        Key: storageKey,
        Body: buffer,
        ContentType: this.getContentType(fileName),
        ServerSideEncryption: S3_CONFIG.serverSideEncryption,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
          applicationId: applicationId || 'unknown'
        }
      });

      console.log("[DEBUG] Executing S3 PutObjectCommand...");
      const s3Result = await s3Client.send(uploadCommand);
      console.log("[DEBUG] S3 command result:", s3Result);

      console.log(`✅ [S3-STORAGE] Upload successful: ${storageKey}`);
      console.log(`✅ [S3-STORAGE] Encryption: ${S3_CONFIG.serverSideEncryption}`);

      // Return storage_key as required by interface
      return storageKey;

    } catch (err: any) {
      console.error("[S3 ERROR]", err);
      console.error("[S3 ERROR] Error code:", err.code);
      console.error("[S3 ERROR] Error name:", err.name);
      console.error("[S3 ERROR] Error message:", err.message);
      console.error(`❌ [S3-STORAGE] Upload failed for ${fileName}:`, err);
      
      // NO FALLBACK - S3 must succeed or upload fails completely
      console.error("[FATAL] Fallback still triggered – this is a system error");
      throw err;
    }
  }

  /**
   * Get document stream from S3
   * @param storageKey - S3 storage key
   * @returns Promise<Readable | null> - File stream or null if not found
   */
  async get(storageKey: string): Promise<Readable | null> {
    // Handle local fallback keys
    if (storageKey.startsWith('local-fallback-')) {
      console.info(`ℹ️ [S3-STORAGE] Local fallback key detected: ${storageKey}`);
      return null;
    }

    try {
      console.log(`☁️ [S3-STORAGE] Retrieving: ${storageKey}`);

      const getCommand = new GetObjectCommand({
        Bucket: S3_CONFIG.bucketName,
        Key: storageKey
      });

      const response = await s3Client.send(getCommand);
      
      if (response.Body instanceof Readable) {
        console.log(`✅ [S3-STORAGE] Retrieved successfully: ${storageKey}`);
        return response.Body;
      }

      return null;

    } catch (error: unknown) {
      console.error(`❌ [S3-STORAGE] Retrieval failed for ${storageKey}:`, error);
      console.info(`ℹ️ [S3-STORAGE] Document not available in cloud storage: ${storageKey}`);
      return null;
    }
  }

  /**
   * Generate pre-signed URL for secure document access
   * @param storageKey - S3 storage key
   * @param expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
   * @returns Promise<string> - Pre-signed URL
   */
  async getPreSignedUrl(storageKey: string, expiresIn: number = 14400): Promise<string> {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: S3_CONFIG.bucketName,
        Key: storageKey
      });

      const preSignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn });
      
      console.log(`🔗 [S3-STORAGE] Pre-signed URL generated for: ${storageKey}`);
      console.log(`🔗 [S3-STORAGE] Expires in: ${expiresIn} seconds`);
      
      return preSignedUrl;

    } catch (error: unknown) {
      console.error(`❌ [S3-STORAGE] Pre-signed URL generation failed for ${storageKey}:`, error);
      throw new Error(`Could not generate access URL for document: ${storageKey}`);
    }
  }

  /**
   * Check if document exists in S3
   * @param storageKey - S3 storage key
   * @returns Promise<boolean> - True if document exists
   */
  async exists(storageKey: string): Promise<boolean> {
    if (storageKey.startsWith('local-fallback-')) {
      return false;
    }

    try {
      const headCommand = new HeadObjectCommand({
        Bucket: S3_CONFIG.bucketName,
        Key: storageKey
      });

      await s3Client.send(headCommand);
      return true;

    } catch (error: unknown) {
      console.info(`ℹ️ [S3-STORAGE] Document not found in cloud: ${storageKey}`);
      return false;
    }
  }

  /**
   * Delete document from S3
   * @param storageKey - S3 storage key
   * @returns Promise<boolean> - True if deleted successfully
   */
  async delete(storageKey: string): Promise<boolean> {
    if (storageKey.startsWith('local-fallback-')) {
      console.info(`ℹ️ [S3-STORAGE] Skipping delete for local fallback: ${storageKey}`);
      return true;
    }

    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: S3_CONFIG.bucketName,
        Key: storageKey
      });

      await s3Client.send(deleteCommand);
      console.log(`🗑️ [S3-STORAGE] Deleted successfully: ${storageKey}`);
      return true;

    } catch (error: unknown) {
      console.error(`❌ [S3-STORAGE] Delete failed for ${storageKey}:`, error);
      return false;
    }
  }

  /**
   * List documents in S3 bucket
   * @param prefix - Optional prefix filter
   * @param maxKeys - Maximum number of keys to return
   * @returns Promise<string[]> - Array of storage keys
   */
  async list(prefix?: string, maxKeys: number = 1000): Promise<string[]> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_CONFIG.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const response = await s3Client.send(listCommand);
      const keys = response.Contents?.map(obj => obj.Key!).filter(Boolean) || [];
      
      console.log(`📋 [S3-STORAGE] Listed ${keys.length} documents`);
      if (prefix) {
        console.log(`📋 [S3-STORAGE] Prefix filter: ${prefix}`);
      }
      
      return keys;

    } catch (error: unknown) {
      console.error(`❌ [S3-STORAGE] List operation failed:`, error);
      return [];
    }
  }

  /**
   * Test S3 connection and permissions
   * @returns Promise<boolean> - True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`🧪 [S3-STORAGE] Testing connection to bucket: ${S3_CONFIG.bucketName}`);
      
      // Test bucket access
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_CONFIG.bucketName,
        MaxKeys: 1
      });

      await s3Client.send(listCommand);
      
      console.log(`✅ [S3-STORAGE] Connection test successful`);
      return true;

    } catch (error: unknown) {
      console.error(`❌ [S3-STORAGE] Connection test failed:`, error);
      return false;
    }
  }

  /**
   * Get appropriate content type for file
   * @param fileName - File name with extension
   * @returns string - MIME content type
   */
  private getContentType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'tiff': 'image/tiff',
      'txt': 'text/plain'
    };

    return contentTypes[ext || ''] || 'application/octet-stream';
  }
}

// Export singleton instance
export const s3Storage = new S3Storage();

// Export client for advanced operations
export { s3Client, S3_CONFIG };

// Compatibility exports for existing code
export async function uploadToStorage(buffer: Buffer, fileName: string, applicationId?: string): Promise<string> {
  return s3Storage.set(buffer, fileName, applicationId);
}

export async function getStorageStream(storageKey: string): Promise<Readable | null> {
  return s3Storage.get(storageKey);
}

export async function generatePreSignedUrl(storageKey: string, expiresIn: number = 3600): Promise<string> {
  return s3Storage.getPreSignedUrl(storageKey, expiresIn);
}

export async function testS3Connection(): Promise<boolean> {
  return s3Storage.testConnection();
}

console.log(`🚀 [S3] Production utility loaded with enterprise-grade configuration`);