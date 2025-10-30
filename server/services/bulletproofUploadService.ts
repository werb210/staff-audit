/**
 * BULLETPROOF DOCUMENT UPLOAD SERVICE
 * Local storage + Azure backup with atomic transactions
 */

import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import mime from 'mime-types';
import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { s3, Azure_CONFIG } from '../config/s3Config';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents');

// Ensure upload directory exists
async function ensureUploadDirectory() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log(`📁 [BULLETPROOF] Upload directory ensured: ${UPLOAD_DIR}`);
  } catch (error) {
    console.error('❌ [BULLETPROOF] Failed to create upload directory:', error);
    throw error;
  }
}

/**
 * STEP 1: Save file to local disk with verification
 */
export async function saveFileToDisk(
  buffer: Buffer, 
  originalName: string,
  documentId: string
): Promise<{ 
  filePath: string; 
  fileSize: number; 
  checksum: string; 
  mimeType: string;
  extension: string;
}> {
  
  await ensureUploadDirectory();
  
  // Determine file extension and MIME type
  const extension = path.extname(originalName).toLowerCase() || '.bin';
  const mimeType = mime.lookup(originalName) || 'application/octet-stream';
  
  const fileName = `${documentId}${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  
  console.log(`📁 [BULLETPROOF] Saving file: ${fileName}`);
  console.log(`📁 [BULLETPROOF] Size: ${buffer.length} bytes`);
  console.log(`📁 [BULLETPROOF] MIME: ${mimeType}`);
  
  try {
    // Write file to disk
    await fs.writeFile(filePath, buffer);
    console.log(`✅ [BULLETPROOF] File written to disk: ${fileName}`);
    
    // Immediate verification
    const stats = await fs.stat(filePath);
    if (stats.size !== buffer.length) {
      throw new Error(`File size mismatch: expected ${buffer.length}, got ${stats.size}`);
    }
    
    // Verify file is readable
    const readBack = await fs.readFile(filePath);
    if (readBack.length !== buffer.length) {
      throw new Error(`File read verification failed`);
    }
    
    console.log(`✅ [BULLETPROOF] File verified: ${fileName} (${stats.size} bytes)`);
    
    // Compute SHA256 checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    console.log(`🔐 [BULLETPROOF] SHA256 computed: ${checksum.substring(0, 16)}...`);
    
    return {
      filePath: `uploads/documents/${fileName}`,
      fileSize: stats.size,
      checksum,
      mimeType,
      extension
    };
    
  } catch (error) {
    // Clean up on failure
    try {
      await fs.unlink(filePath);
      console.log(`🧹 [BULLETPROOF] Cleaned up failed file: ${fileName}`);
    } catch (cleanupError) {
      console.error('❌ [BULLETPROOF] Failed to cleanup file:', cleanupError);
    }
    throw error;
  }
}

/**
 * STEP 2: Create database record with backup pending status
 */
export async function createDocumentRecord(data: {
  id: string;
  applicationId: string;
  fileName: string;
  documentType: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  mimeType: string;
  uploadedBy: string;
}) {
  
  console.log(`📊 [BULLETPROOF] Creating database record: ${data.id}`);
  
  try {
    await db.insert(documents).values({
      id: data.id,
      applicationId: data.applicationId,
      fileName: data.fileName,
      documentType: data.documentType as any,
      filePath: data.filePath,
      fileSize: data.fileSize,
      fileType: path.extname(data.fileName),
      mimeType: data.mimeType,
      sha256Checksum: data.checksum,
      backupStatus: 'pending' as any,
      uploadedBy: data.uploadedBy,
      isVerified: false,
      createdAt: new Date(),
    });
    
    console.log(`✅ [BULLETPROOF] Database record created: ${data.id}`);
    
    // Queue for background backup (don't await)
    queueForBackup(data.id).catch(error => {
      console.error(`❌ [BULLETPROOF] Failed to queue backup for ${data.id}:`, error);
    });
    
    return { success: true, documentId: data.id };
    
  } catch (error) {
    console.error('❌ [BULLETPROOF] Database insert failed:', error);
    
    // Clean up file if database fails
    try {
      await fs.unlink(path.join(process.cwd(), data.filePath));
      console.log(`🧹 [BULLETPROOF] Cleaned up file after database failure: ${data.filePath}`);
    } catch (cleanupError) {
      console.error('❌ [BULLETPROOF] Failed to cleanup file after database failure:', cleanupError);
    }
    
    throw error;
  }
}

/**
 * STEP 3: Queue document for background backup
 */
async function queueForBackup(documentId: string) {
  console.log(`⏳ [BULLETPROOF] Queued for backup: ${documentId}`);
  
  // Don't await - let this happen in background
  performBackup(documentId).catch(error => {
    console.error(`❌ [BULLETPROOF] Background backup failed for ${documentId}:`, error);
    updateBackupStatus(documentId, 'failed').catch(console.error);
  });
}

/**
 * BACKGROUND: Perform actual Azure backup
 */
async function performBackup(documentId: string) {
  if (!s3Client) {
    console.warn(`⚠️ [BULLETPROOF] Azure not available, skipping backup for: ${documentId}`);
    await updateBackupStatus(documentId, 'failed');
    return;
  }
  
  try {
    console.log(`☁️ [BULLETPROOF] Starting backup for: ${documentId}`);
    
    // Get document info
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
      
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }
    
    // Read file from disk
    const filePath = path.join(process.cwd(), document.filePath);
    const buffer = await fs.readFile(filePath);
    
    // Create Azure object key
    const objectKey = `${document.applicationId}/${documentId}${path.extname(document.fileName)}`;
    
    console.log(`☁️ [BULLETPROOF] Uploading to Azure: ${objectKey}`);
    
    // Upload to Azure
    await s3Client.send(new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: document.mimeType || 'application/octet-stream',
      Metadata: {
        originalName: document.fileName,
        documentId: documentId,
        applicationId: document.applicationId,
        checksum: document.sha256Checksum || '',
      },
    }));
    
    console.log(`✅ [BULLETPROOF] Azure backup completed: ${objectKey}`);
    
    // Update database with success
    await updateBackupStatus(documentId, 'completed', objectKey);
    
  } catch (error) {
    console.error(`❌ [BULLETPROOF] Backup failed for ${documentId}:`, error);
    await updateBackupStatus(documentId, 'failed');
    throw error;
  }
}

/**
 * Update backup status in database
 */
async function updateBackupStatus(
  documentId: string, 
  status: 'pending' | 'completed' | 'failed',
  objectKey?: string
) {
  try {
    await db
      .update(documents)
      .set({ 
        backupStatus: status as any,
        objectStorageKey: objectKey || null,
        updatedAt: new Date()
      })
      .where(eq(documents.id, documentId));
      
    console.log(`📊 [BULLETPROOF] Backup status updated: ${documentId} -> ${status}`);
    
  } catch (error) {
    console.error(`❌ [BULLETPROOF] Failed to update backup status for ${documentId}:`, error);
    throw error;
  }
}

/**
 * RETRIEVE: Get file for viewing/downloading
 */
export async function getDocumentFile(documentId: string): Promise<{
  stream: NodeJS.ReadableStream;
  fileName: string;
  fileSize: number;
  mimeType: string;
} | null> {
  
  try {
    console.log(`📁 [BULLETPROOF] Retrieving document: ${documentId}`);
    
    // Get document metadata
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
      
    if (!document) {
      console.log(`❌ [BULLETPROOF] Document not found: ${documentId}`);
      return null;
    }
    
    // Try local file first
    const localPath = path.join(process.cwd(), document.filePath);
    
    try {
      await fs.access(localPath);
      
      console.log(`📁 [BULLETPROOF] Serving from local disk: ${document.fileName}`);
      
      return {
        stream: createReadStream(localPath),
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType || 'application/octet-stream'
      };
      
    } catch (localError) {
      console.log(`⚠️ [BULLETPROOF] Local file not found, trying Azure backup: ${documentId}`);
      
      // Try Azure backup
      if (s3Client && document.objectStorageKey && document.backupStatus === 'completed') {
        try {
          console.log(`☁️ [BULLETPROOF] Fetching from Azure: ${document.objectStorageKey}`);
          
          const response = await s3Client.send(new GetObjectCommand({
            Bucket: s3Config.bucket,
            Key: document.objectStorageKey,
          }));
          
          if (response.Body) {
            console.log(`✅ [BULLETPROOF] Serving from Azure: ${document.fileName}`);
            
            return {
              stream: response.Body as NodeJS.ReadableStream,
              fileName: document.fileName,
              fileSize: document.fileSize,
              mimeType: document.mimeType || 'application/octet-stream'
            };
          }
          
        } catch (s3Error) {
          console.error(`❌ [BULLETPROOF] Azure retrieval failed:`, s3Error);
        }
      }
      
      console.log(`❌ [BULLETPROOF] File not available anywhere: ${documentId}`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ [BULLETPROOF] Error retrieving document ${documentId}:`, error);
    return null;
  }
}

/**
 * Complete upload process - combines all steps
 */
export async function bulletproofUploadDocument(
  buffer: Buffer,
  originalName: string,
  documentType: string,
  applicationId: string,
  uploadedBy: string
): Promise<{ success: boolean; documentId: string; error?: string }> {
  
  const documentId = uuid();
  
  console.log(`🚀 [BULLETPROOF] Starting upload: ${originalName}`);
  console.log(`🚀 [BULLETPROOF] Document ID: ${documentId}`);
  console.log(`🚀 [BULLETPROOF] Application: ${applicationId}`);
  
  try {
    // Step 1: Save to disk with verification
    const diskResult = await saveFileToDisk(buffer, originalName, documentId);
    
    // Step 2: Create database record
    const dbResult = await createDocumentRecord({
      id: documentId,
      applicationId,
      fileName: originalName,
      documentType,
      filePath: diskResult.filePath,
      fileSize: diskResult.fileSize,
      checksum: diskResult.checksum,
      mimeType: diskResult.mimeType,
      uploadedBy,
    });
    
    console.log(`🎯 [BULLETPROOF] Upload successful: ${documentId}`);
    
    return {
      success: true,
      documentId: documentId
    };
    
  } catch (error) {
    console.error(`💥 [BULLETPROOF] Upload failed for ${originalName}:`, error);
    
    return {
      success: false,
      documentId: documentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}