import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function runDocumentStartupAudit() {
  console.log('🔍 [STARTUP AUDIT] Starting comprehensive startup audit with write verification...');
  
  // STEP 1: Run file verification first to detect any missing/corrupted files
  try {
    const { verifyUploadedFiles } = await import('../utils/fileVerificationService');
    const verificationResults = await verifyUploadedFiles();
    
    if (verificationResults.issues.length > 0) {
      console.log(`🚨 [STARTUP AUDIT] CRITICAL: ${verificationResults.issues.length} file integrity issues detected!`);
      for (const issue of verificationResults.issues) {
        console.log(`❌ [STARTUP-AUDIT] MISSING: ${issue.fileName} (${issue.documentId})`);
        console.log(`   Expected path: uploads/documents/${issue.documentId}.pdf`);
        console.log(`🚨 [ALERT-CRITICAL] Data loss detected`);
        console.log(`🔥 [CRITICAL ALERT] Data loss detected - Immediate attention required`);
        console.log(`📋 [ALERT-DETAILS] ${JSON.stringify({
          documentName: issue.fileName,
          applicationId: "bc4260af-f35e-42c7-a637-4422fb5fb048",
          error: `File missing on disk: uploads/documents/${issue.documentId}.pdf`,
          details: {
            documentId: issue.documentId,
            expectedPath: `uploads/documents/${issue.documentId}.pdf`,
            detectedAt: "server-startup"
          }
        }, null, 2)}`);
      }
      console.log(`🚨 [STARTUP-AUDIT] CRITICAL: ${verificationResults.missing} files are missing from disk`);
      console.log(`🚨 [STARTUP-AUDIT] This indicates data loss - check logs/alerts.log for details`);
    } else {
      console.log(`✅ [STARTUP AUDIT] All files verified successfully - no missing files detected`);
    }
  } catch (verifyError) {
    console.error(`❌ [STARTUP AUDIT] File verification failed:`, verifyError);
  }
  
  console.log('🔍 [PHASE 1] Safe startup audit completed');

  try {
    // Get documents missing SHA256 checksums
    const missingHashDocs = await sql`
      SELECT * FROM documents WHERE checksum IS NULL
    `;

    console.log(`📊 [STARTUP AUDIT] Found ${missingHashDocs.length} documents missing SHA256`);

    // Backfill SHA256 checksums
    let hashesAdded = 0;
    for (const doc of missingHashDocs as any[]) {
      const filePath = path.join("uploads", "documents", `${doc.id}.${doc.file_name.split('.').pop() || 'txt'}`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ [STARTUP AUDIT] File not found for checksum: ${filePath}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const sha256 = createHash("sha256").update(fileBuffer).digest("hex");

      await sql`
        UPDATE documents 
        SET checksum = ${sha256} 
        WHERE id = ${doc.id}
      `;
      
      console.log(`✅ [STARTUP AUDIT] SHA256 added for ${doc.file_name}: ${sha256.substring(0, 16)}...`);
      hashesAdded++;
    }

    // Get documents missing storage keys
    const missingStorageDocs = await sql`
      SELECT * FROM documents WHERE storage_key IS NULL
    `;

    console.log(`📊 [STARTUP AUDIT] Found ${missingStorageDocs.length} documents missing Object Storage backup`);

    // Backfill Object Storage keys
    let storageKeysAdded = 0;
    for (const doc of missingStorageDocs as any[]) {
      const filePath = path.join("uploads", "documents", `${doc.id}.${doc.file_name.split('.').pop() || 'txt'}`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ [STARTUP AUDIT] File not found for storage backup: ${filePath}`);
        continue;
      }

      const buffer = fs.readFileSync(filePath);
      const key = `backup/${doc.id}-${Date.now()}`;
      
      try {
        // Upload to S3 first, then store the key
        const { uploadToS3 } = await import('../utils/s3');
        const s3Storage = new (await import('../utils/s3')).S3Storage();
        const storageKey = await s3Storage.set(buffer, doc.file_name, doc.application_id);
        
        await sql`
          UPDATE documents 
          SET storage_key = ${storageKey} 
          WHERE id = ${doc.id}
        `;
        
        console.log(`☁️ [STARTUP AUDIT] S3 storage key added for ${doc.file_name}: ${storageKey}`);
        storageKeysAdded++;
      } catch (err) {
        console.error(`❌ [STARTUP AUDIT] S3 upload failed for ${doc.id}:`, err);
        console.error("[UPLOAD FAILURE] S3 upload failed:", err);
        throw err;
      }
    }

    console.log(`✅ [STARTUP AUDIT] Document backfill completed: ${hashesAdded} checksums, ${storageKeysAdded} storage keys`);
    
    return {
      hashesAdded,
      storageKeysAdded,
      totalProcessed: hashesAdded + storageKeysAdded
    };

  } catch (error) {
    console.error('❌ [STARTUP AUDIT] Failed:', error);
    throw error;
  }
}

export async function getSystemValidationStatus() {
  try {
    const totalDocs = await sql`SELECT COUNT(*) as count FROM documents`;
    const missingChecksums = await sql`SELECT COUNT(*) as count FROM documents WHERE checksum IS NULL`;
    const missingStorageKeys = await sql`SELECT COUNT(*) as count FROM documents WHERE storage_key IS NULL`;
    
    const total = (totalDocs as any[])[0].count;
    const missingHashes = (missingChecksums as any[])[0].count;
    const missingStorage = (missingStorageKeys as any[])[0].count;
    
    return {
      summary: {
        totalDocuments: total,
        missingChecksums: missingHashes,
        missingStorageKeys: missingStorage,
        healthScore: total > 0 ? Math.round(((total - missingHashes - missingStorage) / (total * 2)) * 100) : 100
      }
    };
  } catch (error) {
    console.error('❌ System validation status failed:', error);
    throw error;
  }
}