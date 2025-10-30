import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db';
import { documents } from '../../shared/schema';
import { uploadToAzure, testAzureConnection } from '../config/s3Config';

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

    // Step 3: Azure Primary Storage (enabled for all environments)
    let storageKey = null;
    let backupStatus = 'none';
    
    try {
      console.log(`☁️ [Azure PRIMARY] Uploading to Azure primary storage...`);
      storageKey = `${applicationId}/${fileName}`;
      await uploadToAzure({
        file: fileBuffer,
        fileName: fileName,
        contentType: mimeType,
        applicationId: applicationId
      });
      backupStatus = 'completed';
      console.log(`✅ [Azure PRIMARY] File uploaded to Azure: ${storageKey}`);
    } catch (s3Error: any) {
      console.error(`❌ [Azure PRIMARY] Failed to upload to Azure:`, s3Error.message);
      backupStatus = 'failed';
      // Continue with disk storage as fallback
      console.log(`🔄 [Azure PRIMARY] Continuing with disk fallback due to Azure error`);
    }

    // Step 4: Create database record AFTER disk verification and Azure backup
    const dbResult = await db.insert(documents).values({
      id: documentId,
      applicationId: applicationId,
      document_type: documentType,
      name: fileName,
      file_path: filePath,
      size: fileSize,
      file_type: mimeType,
      file_exists: true,
      checksum: checksum,
      storage_key: storageKey, // Azure key if uploaded, null in dev mode
      backup_status: backupStatus, // Track backup status
      is_required: false,
      is_verified: false,
      createdAt: new Date(),
      updatedAt: new Date()
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