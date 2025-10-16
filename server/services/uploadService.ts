import { db } from '../db';
import { documents, retryUploadLogs } from '../../shared/schema';
import { uploadToS3 } from '../utils/s3DirectStorage';
import { enqueueUploadRetry } from '../queues/retryQueue';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

interface UploadResult {
  success: boolean;
  documentId?: string;
  filename: string;
  documentType: string;
  storage?: string;
  retryEnqueued?: boolean;
  message?: string;
  storageKey?: string;
}

/**
 * STRICT UPLOAD SERVICE - NO FALLBACK RESPONSES
 * Either succeeds with real S3 upload or fails with retry queue
 */
export async function processDocumentUpload(
  applicationId: string,
  file: Express.Multer.File,
  documentType: string
): Promise<UploadResult> {
  const filename = file.originalname;
  const fs = await import('fs');
  const buffer = file.buffer || Buffer.from(file.path ? fs.readFileSync(file.path) : []);
  
  console.log(`🔧 [UPLOAD-SERVICE] Processing upload: ${filename} for application ${applicationId}`);
  console.log(`📊 [UPLOAD-SERVICE] File size: ${buffer.length} bytes, Type: ${documentType}`);

  try {
    // Attempt direct S3 upload
    console.log(`☁️ [UPLOAD-SERVICE] Attempting S3 upload...`);
    const s3Result = await uploadToS3(buffer, filename, applicationId);
    
    if (!s3Result.success) {
      throw new Error(s3Result.error || 'S3 upload failed');
    }

    console.log(`✅ [UPLOAD-SERVICE] S3 upload successful: ${s3Result.storageKey}`);

    // Create document record with real S3 data
    const documentId = uuidv4();
    await db.insert(documents).values({
      id: documentId,
      applicationId: applicationId,
      fileName: filename,
      fileSize: buffer.length,
      documentType: documentType as any,
      storageKey: s3Result.storageKey,
      objectStorageKey: s3Result.storageKey,
      storageStatus: 'uploaded',
      mimeType: file.mimetype,
      checksum: s3Result.checksum,
      sha256Checksum: s3Result.checksum,
      uploadedBy: 'system',
      isVerified: false,
      status: 'pending'
    });

    console.log(`✅ [UPLOAD-SERVICE] Document record created: ${documentId}`);

    return {
      success: true,
      documentId: documentId,
      filename: filename,
      documentType: documentType,
      storage: 's3',
      storageKey: s3Result.storageKey
    };

  } catch (error: any) {
    console.error(`❌ [UPLOAD-SERVICE] S3 upload failed for ${filename}:`, error.message);

    // NO FALLBACK - Enqueue for retry instead
    try {
      await enqueueUploadRetry({
        applicationId: applicationId,
        fileBuffer: buffer,
        fileName: filename,
        documentType: documentType,
        attempt: 1,
        error: error.message
      });

      console.log(`📋 [UPLOAD-SERVICE] Upload retry enqueued for ${filename}`);

      return {
        success: false,
        retryEnqueued: true,
        message: `Upload failed: ${error.message}. Queued for automatic retry.`,
        filename: filename,
        documentType: documentType
      };
    } catch (retryError: any) {
      console.error(`❌ [UPLOAD-SERVICE] Failed to enqueue retry for ${filename}:`, retryError.message);
      
      return {
        success: false,
        retryEnqueued: false,
        message: `Upload failed and retry queue unavailable: ${error.message}`,
        filename: filename,
        documentType: documentType
      };
    }
  }
}

/**
 * Log retry failure for audit trail
 */
export async function logRetryFailure(payload: {
  applicationId: string;
  fileName: string;
  documentType: string;
  error: string;
  attempt: number;
}) {
  try {
    await db.insert(retryUploadLogs).values({
      applicationId: payload.applicationId,
      fileName: payload.fileName,
      documentType: payload.documentType as any,
      errorMessage: payload.error,
      attempt: payload.attempt,
      retryScheduledAt: new Date(),
      retrySuccess: false
    });

    console.log(`📝 [RETRY-LOG] Logged retry attempt ${payload.attempt} for ${payload.fileName}`);
  } catch (error: any) {
    console.error(`❌ [RETRY-LOG] Failed to log retry:`, error.message);
  }
}

/**
 * Update retry log when retry succeeds
 */
export async function logRetrySuccess(applicationId: string, fileName: string, documentId: string) {
  try {
    // Find the most recent retry log for this file
    const retryLog = await db
      .select()
      .from(retryUploadLogs)
      .where(eq(retryUploadLogs.applicationId, applicationId))
      .where(eq(retryUploadLogs.fileName, fileName))
      .orderBy(desc(retryUploadLogs.createdAt))
      .limit(1);

    if (retryLog.length > 0) {
      await db
        .update(retryUploadLogs)
        .set({
          retryCompletedAt: new Date(),
          retrySuccess: true
        })
        .where(eq(retryUploadLogs.id, retryLog[0].id));

      console.log(`✅ [RETRY-LOG] Updated retry success for ${fileName}`);
    }
  } catch (error: any) {
    console.error(`❌ [RETRY-LOG] Failed to update retry success:`, error.message);
  }
}