import Queue from 'bull';
import { uploadToS3 } from '../utils/s3DirectStorage';
import { db } from '../db';
import { documents, retryUploadLogs } from '../../shared/schema';
import { logRetryFailure, logRetrySuccess } from '../services/uploadService';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

// Create retry queue for failed uploads
export const retryQueue = new Queue('document-upload-retries', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50,     // Keep last 50 failed jobs for debugging
  }
});

interface RetryPayload {
  applicationId: string;
  fileBuffer: Buffer;
  fileName: string;
  documentType: string;
  attempt: number;
  error: string;
}

/**
 * Enqueue upload retry with exponential backoff
 */
export async function enqueueUploadRetry(payload: RetryPayload): Promise<void> {
  console.log(`📋 [RETRY-QUEUE] Enqueuing retry for ${payload.fileName}, attempt ${payload.attempt}`);

  // Log the retry attempt for audit trail
  await logRetryFailure(payload);

  // Add to retry queue with exponential backoff
  await retryQueue.add('upload-retry', payload, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay
    },
    delay: Math.pow(2, payload.attempt - 1) * 5000, // Exponential delay
  });

  console.log(`✅ [RETRY-QUEUE] Retry job enqueued for ${payload.fileName}`);
}

/**
 * Process retry queue jobs
 */
retryQueue.process('upload-retry', async (job) => {
  const { applicationId, fileBuffer, fileName, documentType, attempt } = job.data;

  console.log(`🔄 [RETRY-WORKER] Processing retry attempt ${attempt} for ${fileName}`);

  try {
    // Attempt S3 upload again
    const s3Result = await uploadToS3(fileBuffer, fileName, applicationId);
    
    if (!s3Result.success) {
      throw new Error(s3Result.error || 'S3 upload failed during retry');
    }

    console.log(`☁️ [RETRY-WORKER] S3 upload successful: ${s3Result.storageKey}`);

    // Create document record with real S3 data
    const documentId = uuidv4();
    await db.insert(documents).values({
      id: documentId,
      applicationId: applicationId,
      fileName: fileName,
      fileSize: fileBuffer.length,
      documentType: documentType as any,
      storageKey: s3Result.storageKey,
      objectStorageKey: s3Result.storageKey,
      storageStatus: 'uploaded',
      checksum: s3Result.checksum,
      sha256Checksum: s3Result.checksum,
      uploadedBy: 'retry-system',
      isVerified: false,
      status: 'pending'
    });

    // Update retry log to show success
    await logRetrySuccess(applicationId, fileName, documentId);

    console.log(`✅ [RETRY-WORKER] Retry succeeded for ${fileName}, document ID: ${documentId}`);

    // Emit success event for real-time monitoring
    try {
      const { getGlobalIo } = await import('../services/websocket');
      const io = getGlobalIo();
      if (io) {
        io.emit('upload-retry-success', {
          applicationId,
          fileName,
          documentId,
          storageKey: s3Result.storageKey,
          attempt
        });
      }
    } catch (wsError) {
      console.log(`⚠️ [RETRY-WORKER] WebSocket notification failed (non-critical):`, wsError);
    }

    return { success: true, documentId, storageKey: s3Result.storageKey };

  } catch (error: any) {
    console.error(`❌ [RETRY-WORKER] Retry attempt ${attempt} failed for ${fileName}:`, error.message);

    // Update retry log with failure details
    try {
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
            finalErrorMessage: error.message,
            retrySuccess: false
          })
          .where(eq(retryUploadLogs.id, retryLog[0].id));
      }
    } catch (logError) {
      console.error(`❌ [RETRY-WORKER] Failed to update retry log:`, logError);
    }

    // Re-throw error to trigger Bull.js retry mechanism
    throw error;
  }
});

/**
 * Handle final failure after all retries exhausted
 */
retryQueue.on('failed', async (job, error) => {
  const { applicationId, fileName, attempt } = job.data;
  
  console.error(`💥 [RETRY-QUEUE] All retries exhausted for ${fileName} after ${attempt} attempts`);
  console.error(`💥 [RETRY-QUEUE] Final error:`, error.message);

  // Log final failure for audit
  try {
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
          finalErrorMessage: `All retries exhausted: ${error.message}`,
          retrySuccess: false,
          retryCompletedAt: new Date()
        })
        .where(eq(retryUploadLogs.id, retryLog[0].id));
    }

    // Emit failure event for monitoring
    try {
      const { getGlobalIo } = await import('../services/websocket');
      const io = getGlobalIo();
      if (io) {
        io.emit('upload-retry-failed', {
          applicationId,
          fileName,
          error: error.message,
          attemptsExhausted: true
        });
      }
    } catch (wsError) {
      console.log(`⚠️ [RETRY-QUEUE] WebSocket notification failed (non-critical):`, wsError);
    }

  } catch (logError) {
    console.error(`❌ [RETRY-QUEUE] Failed to log final failure:`, logError);
  }
});

/**
 * Handle successful retry completion
 */
retryQueue.on('completed', (job, result) => {
  const { fileName } = job.data;
  console.log(`🎉 [RETRY-QUEUE] Successfully completed retry for ${fileName}`);
});

/**
 * Get retry queue status for monitoring
 */
export async function getRetryQueueStatus() {
  const waiting = await retryQueue.getWaiting();
  const active = await retryQueue.getActive();
  const completed = await retryQueue.getCompleted();
  const failed = await retryQueue.getFailed();

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    jobs: {
      waiting: waiting.map(job => ({
        id: job.id,
        fileName: job.data.fileName,
        attempt: job.data.attempt,
        createdAt: job.timestamp
      })),
      active: active.map(job => ({
        id: job.id,
        fileName: job.data.fileName,
        attempt: job.data.attempt,
        processedOn: job.processedOn
      }))
    }
  };
}

console.log(`🔄 [RETRY-QUEUE] Document upload retry queue initialized`);
console.log(`📊 [RETRY-QUEUE] Configuration: 5 attempts, exponential backoff starting at 5s`);

export default retryQueue;