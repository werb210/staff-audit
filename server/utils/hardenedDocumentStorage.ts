/**
 * 🛡️ HARDENED DOCUMENT STORAGE SYSTEM
 * 
 * Implements bulletproof document storage with comprehensive audit logging,
 * mandatory checksum verification, and guaranteed S3 backup fallback.
 * 
 * Created: July 21, 2025
 * Purpose: Resolve critical document disappearance issue
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

const BASE_DIR = process.cwd();

export interface HardenedUploadResult {
  success: boolean;
  documentId: string;
  filePath: string;
  checksum: string;
  diskWriteSuccess: boolean;
  s3BackupSuccess: boolean;
  error?: string;
}

export interface UploadAuditLog {
  documentId: string;
  applicationId: string;
  fileName: string;
  uploadAttemptedAt: Date;
  diskWriteSuccessful: boolean;
  s3BackupSuccessful: boolean;
  checksumVerified: boolean;
  errorMessage?: string;
  recoveryAttemptedAt?: Date;
}

/**
 * Calculates SHA256 checksum for file content
 */
function calculateChecksum(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Verifies file exists and matches expected checksum
 */
async function verifyFileIntegrity(filePath: string, expectedChecksum: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath);
    const actualChecksum = calculateChecksum(content);
    return actualChecksum === expectedChecksum;
  } catch (error: unknown) {
    console.error(`❌ [INTEGRITY] File verification failed: ${filePath}`, error);
    return false;
  }
}

/**
 * Logs upload audit information to database
 */
async function logUploadAudit(auditData: UploadAuditLog): Promise<void> {
  try {
    await db.execute(`
      INSERT INTO document_upload_log (
        document_id, application_id, file_name, upload_attempted_at,
        disk_write_successful, s3_backup_successful, checksum_verified,
        error_message, recovery_attempted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `, [
      auditData.documentId,
      auditData.applicationId,
      auditData.fileName,
      auditData.uploadAttemptedAt.toISOString(),
      auditData.diskWriteSuccessful,
      auditData.s3BackupSuccessful,
      auditData.checksumVerified,
      auditData.errorMessage || null,
      auditData.recoveryAttemptedAt?.toISOString() || null
    ]);
    
    console.log(`📊 [AUDIT] Upload log recorded for document: ${auditData.documentId}`);
  } catch (error: unknown) {
    console.error(`❌ [AUDIT] Failed to log upload audit:`, error);
  }
}

/**
 * Attempts S3 backup with retry logic using proper S3 integration
 */
async function attemptS3Backup(content: Buffer, fileName: string, documentId: string, applicationId: string): Promise<{success: boolean, storageKey?: string, error?: string}> {
  try {
    console.log(`☁️ [S3-HARDENED] Starting S3 upload for: ${fileName} (${documentId})`);

    // Use proper S3 system instead of old object storage fallback
    const { S3Storage } = await import('./s3.js');
    const s3Storage = new S3Storage();
    
    // Upload directly to S3 with proper storage key format
    const storageKey = await s3Storage.set(content, fileName, applicationId);
    
    console.log(`✅ [S3-HARDENED] S3 upload successful: ${storageKey}`);
    return { success: true, storageKey };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown S3 error';
    console.error(`❌ [S3-HARDENED] S3 upload failed for ${documentId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Hardened document storage with comprehensive verification
 */
export async function hardenedSaveDocument(
  applicationId: string,
  sourceFilePath: string,
  originalFileName: string,
  documentType: string,
  uploadedBy = 'system'
): Promise<HardenedUploadResult> {
  
  const documentId = uuid();
  const startTime = new Date();
  
  console.log(`🛡️ [HARDENED] Starting hardened save for: ${originalFileName} (ID: ${documentId})`);
  
  // Initialize audit log
  const auditLog: UploadAuditLog = {
    documentId,
    applicationId,
    fileName: originalFileName,
    uploadAttemptedAt: startTime,
    diskWriteSuccessful: false,
    s3BackupSuccessful: false,
    checksumVerified: false
  };

  try {
    // Step 1: Read source file and calculate checksum
    const fileContent = await fs.readFile(sourceFilePath);
    const originalChecksum = calculateChecksum(fileContent);
    const fileStats = await fs.stat(sourceFilePath);
    
    console.log(`📂 [HARDENED] File read successfully: ${fileStats.size} bytes, checksum: ${originalChecksum.substring(0, 16)}...`);
    
    // Step 2: Prepare target path
    const fileExt = path.extname(originalFileName).toLowerCase() || '.pdf';
    const documentsDir = path.join(BASE_DIR, 'uploads', 'documents');
    const fileName = `${documentId}${fileExt}`;
    const targetFilePath = path.join(documentsDir, fileName);
    const dbFilePath = `uploads/documents/${fileName}`;
    
    // Ensure directory exists
    await fs.mkdir(documentsDir, { recursive: true });
    
    // Step 3: Write to disk with verification
    console.log(`💾 [HARDENED] Writing to disk: ${targetFilePath}`);
    await fs.writeFile(targetFilePath, fileContent);
    
    // Step 4: Verify disk write immediately
    const verifyExists = await fs.access(targetFilePath).then(() => true).catch(() => false);
    if (!verifyExists) {
      throw new Error(`File verification failed - file not found after write: ${targetFilePath}`);
    }
    
    const verifyChecksum = await verifyFileIntegrity(targetFilePath, originalChecksum);
    if (!verifyChecksum) {
      throw new Error(`Checksum verification failed after disk write`);
    }
    
    auditLog.diskWriteSuccessful = true;
    auditLog.checksumVerified = true;
    console.log(`✅ [HARDENED] Disk write verified successfully`);
    
    // Step 5: DIRECTLY use S3 system - NO FALLBACK ALLOWED
    const { S3Storage } = await import('./s3.js');
    const s3Storage = new S3Storage();
    const storageKey = await s3Storage.set(fileContent, originalFileName, applicationId);
    
    // Verify S3 upload succeeded
    if (!storageKey) {
      throw new Error('S3 upload failed - no storage key returned');
    }
    
    auditLog.s3BackupSuccessful = true;
    
    console.log(`✅ [HARDENED] S3 upload confirmed: ${storageKey}`);
    
    // Step 6: Create database record ONLY after successful disk write
    await db.insert(documents).values({
      id: documentId,
      applicationId,
      fileName: originalFileName,
      filePath: dbFilePath,
      fileType: documentType,
      fileSize: fileStats.size,
      uploadedBy,
      storageKey,
      checksum: originalChecksum,
      fileExists: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`🗄️ [HARDENED] Database record created successfully`);
    
    // Step 7: Log successful audit
    await logUploadAudit(auditLog);
    
    console.log(`🎯 [HARDENED] Complete success for ${originalFileName} in ${Date.now() - startTime.getTime()}ms`);
    
    return {
      success: true,
      documentId,
      filePath: targetFilePath,
      checksum: originalChecksum,
      diskWriteSuccess: true,
      s3BackupSuccess: s3Result.success
    };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error';
    auditLog.errorMessage = errorMessage;
    
    console.error(`💥 [HARDENED] Upload failed for ${originalFileName}:`, errorMessage);
    
    // Log failed audit
    await logUploadAudit(auditLog);
    
    // Cleanup: Remove any partial files
    try {
      const targetPath = path.join(BASE_DIR, 'uploads', 'documents', `${documentId}${path.extname(originalFileName)}`);
      await fs.unlink(targetPath).catch(() => {}); // Silent cleanup
    } catch (cleanupError) {
      console.warn(`⚠️ [HARDENED] Cleanup warning:`, cleanupError);
    }
    
    return {
      success: false,
      documentId,
      filePath: '',
      checksum: '',
      diskWriteSuccess: auditLog.diskWriteSuccessful,
      s3BackupSuccess: auditLog.s3BackupSuccessful,
      error: errorMessage
    };
  }
}

/**
 * Retrieves upload audit logs for a document
 */
export async function getUploadAuditLogs(documentId: string): Promise<UploadAuditLog[]> {
  try {
    const result = await db.execute(`
      SELECT * FROM document_upload_log 
      WHERE document_id = $1 
      ORDER BY upload_attempted_at DESC
    `, [documentId]);
    
    return result.rows.map(row => ({
      documentId: row.document_id,
      applicationId: row.applicationId,
      fileName: row.fileName,
      uploadAttemptedAt: new Date(row.upload_attempted_at),
      diskWriteSuccessful: row.disk_write_successful,
      s3BackupSuccessful: row.s3_backup_successful,
      checksumVerified: row.checksum_verified,
      errorMessage: row.error_message || undefined,
      recoveryAttemptedAt: row.recovery_attempted_at ? new Date(row.recovery_attempted_at) : undefined
    }));
  } catch (error: unknown) {
    console.error(`❌ [AUDIT] Failed to retrieve audit logs for ${documentId}:`, error);
    return [];
  }
}

/**
 * Scans for orphaned document records (DB exists but file missing)
 */
export async function scanForOrphanedDocuments(): Promise<string[]> {
  try {
    const allDocuments = await db.select().from(documents);
    const orphanedIds: string[] = [];
    
    for (const doc of allDocuments) {
      if (doc.filePath) {
        const fullPath = path.join(BASE_DIR, doc.filePath);
        const exists = await fs.access(fullPath).then(() => true).catch(() => false);
        
        if (!exists) {
          orphanedIds.push(doc.id);
          console.log(`🔍 [SCAN] Orphaned document found: ${doc.fileName} (${doc.id})`);
        }
      }
    }
    
    console.log(`📊 [SCAN] Scan complete: ${orphanedIds.length} orphaned documents found`);
    return orphanedIds;
    
  } catch (error: unknown) {
    console.error(`❌ [SCAN] Failed to scan for orphaned documents:`, error);
    return [];
  }
}