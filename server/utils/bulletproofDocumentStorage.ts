import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db';
import { documents } from '../../shared/schema';
import { uploadToS3, testS3Connection } from '../config/s3Config';

interface DocumentUploadParams {
  documentId: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  fileBuffer: Buffer;
  fileSize: number;
  mimeType: string;
  checksum: string;
}

export function computeChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Bulletproof document storage system
 * Saves file to disk with UUID-based naming and creates database record
 */
export async function saveDocumentToDiskAndDB(params: DocumentUploadParams) {
  const {
    documentId,
    applicationId,
    documentType,
    fileName,
    fileBuffer,
    fileSize,
    mimeType,
    checksum
  } = params;

  console.log(`🔒 [BULLETPROOF STORAGE] Starting bulletproof save for: ${fileName}`);
  console.log(`🔒 [BULLETPROOF STORAGE] Document ID: ${documentId}`);
  console.log(`🔒 [BULLETPROOF STORAGE] Checksum: ${checksum}`);

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
  await fs.mkdir(uploadsDir, { recursive: true });

  // Create file path with UUID-based naming
  const fileExtension = path.extname(fileName);
  const diskFileName = `${documentId}${fileExtension}`;
  const filePath = path.join(uploadsDir, diskFileName);

  try {
    // Step 1: Write file to disk FIRST (disk-only bulletproof logic)
    await fs.writeFile(filePath, fileBuffer);
    console.log(`📂 [BULLETPROOF DISK-ONLY] File written to: ${filePath}`);

    // Step 2: Verify file accessibility and size
    await fs.access(filePath); // Confirm file exists and is accessible
    const stats = await fs.stat(filePath);
    if (stats.size !== fileSize) {
      throw new Error(`File size mismatch: expected ${fileSize}, got ${stats.size}`);
    }
    console.log(`✅ [BULLETPROOF DISK-ONLY] File verified: ${stats.size} bytes`);

    // Step 3: S3 Primary Storage (enabled for all environments)
    let storageKey = null;
    let backupStatus = 'none';
    
    try {
      console.log(`☁️ [S3 PRIMARY] Uploading to S3 primary storage...`);
      storageKey = `${applicationId}/${fileName}`;
      await uploadToS3({
        file: fileBuffer,
        fileName: fileName,
        contentType: mimeType,
        applicationId: applicationId
      });
      backupStatus = 'completed';
      console.log(`✅ [S3 PRIMARY] File uploaded to S3: ${storageKey}`);
    } catch (s3Error: any) {
      console.error(`❌ [S3 PRIMARY] Failed to upload to S3:`, s3Error.message);
      backupStatus = 'failed';
      // Continue with disk storage as fallback
      console.log(`🔄 [S3 PRIMARY] Continuing with disk fallback due to S3 error`);
    }

    // Step 4: Create database record AFTER disk verification and S3 backup
    const dbResult = await db.insert(documents).values({
      id: documentId,
      application_id: applicationId,
      document_type: documentType,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      file_type: mimeType,
      file_exists: true,
      checksum: checksum,
      storage_key: storageKey, // S3 key if uploaded, null in dev mode
      backup_status: backupStatus, // Track backup status
      is_required: false,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    console.log(`💾 [BULLETPROOF STORAGE] Database record created successfully`);
    console.log(`✅ [BULLETPROOF STORAGE] Complete bulletproof save finished for: ${fileName}`);

    return {
      id: documentId,
      file_path: filePath,
      checksum: checksum,
      file_exists: true
    };

  } catch (error: unknown) {
    console.error(`❌ [BULLETPROOF STORAGE] Error saving document:`, error);
    
    // Cleanup file if database insert failed
    try {
      await fs.unlink(filePath);
      console.log(`🧹 [BULLETPROOF STORAGE] Cleaned up file after error: ${filePath}`);
    } catch (cleanupError) {
      console.error(`❌ [BULLETPROOF STORAGE] Failed to cleanup file:`, cleanupError);
    }
    
    throw error;
  }
}