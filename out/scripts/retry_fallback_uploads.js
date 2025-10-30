#!/usr/bin/env node
/**
 * Fallback Upload Recovery Script
 *
 * Reads files from /uploads/fallback/
 * Validates SHA256 checksums
 * Uploads to S3
 * Updates documents table to reflect real storageKey
 * Deletes fallback file on success
 *
 * Usage:
 *   npx tsx scripts/retry_fallback_uploads.ts                    # Retry all
 *   npx tsx scripts/retry_fallback_uploads.ts --document-id=123  # Retry specific
 */
import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
class FallbackRecoveryService {
    s3Client;
    bucketName;
    constructor() {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION || 'ca-central-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'boreal-production-uploads';
    }
    async retryFallbackUpload(document) {
        try {
            console.log(`🔄 Processing: ${document.file_name} (${document.id.slice(0, 8)}...)`);
            // 1. Verify file exists
            if (!existsSync(document.file_path)) {
                throw new Error(`File not found: ${document.file_path}`);
            }
            // 2. Read file and verify checksum
            const fileBuffer = readFileSync(document.file_path);
            const actualChecksum = createHash('sha256').update(fileBuffer).digest('hex');
            if (actualChecksum !== document.checksum) {
                throw new Error(`Checksum mismatch: expected ${document.checksum}, got ${actualChecksum}`);
            }
            console.log(`✅ File verified: ${fileBuffer.length} bytes, checksum matches`);
            // 3. Generate new S3 storage key
            const fileExtension = document.file_name.split('.').pop();
            const newStorageKey = `${document.application_id}/${document.id}.${fileExtension}`;
            // 4. Upload to S3
            const uploadCommand = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: newStorageKey,
                Body: fileBuffer,
                ContentType: this.getMimeType(document.file_name),
                ServerSideEncryption: 'AES256',
                Metadata: {
                    originalName: document.file_name,
                    recoveredAt: new Date().toISOString(),
                    originalFallbackPath: document.file_path,
                },
            });
            await this.s3Client.send(uploadCommand);
            console.log(`☁️ Uploaded to S3: ${newStorageKey}`);
            // 5. Update database
            await db.execute(sql `
        UPDATE documents 
        SET 
          storage_key = ${newStorageKey},
          storage_status = 'success',
          file_path = NULL,
          updated_at = NOW()
        WHERE id = ${document.id}
      `);
            // 6. Log recovery success
            await db.execute(sql `
        INSERT INTO document_upload_log (
          application_id, document_id, filename, file_size, sha256,
          status, bucket_name, storage_key, error_message, ip_address, user_agent
        ) VALUES (
          ${document.application_id}, ${document.id}, ${document.file_name}, ${document.file_size}, ${document.checksum},
          'success', ${this.bucketName}, ${newStorageKey}, 'Recovered from fallback storage', NULL, 'fallback-recovery-script'
        )
      `);
            // 7. Delete fallback file
            unlinkSync(document.file_path);
            console.log(`🗑️ Deleted fallback file: ${document.file_path}`);
            return {
                success: true,
                newStorageKey,
            };
        }
        catch (error) {
            console.error(`❌ Recovery failed: ${error.message}`);
            // Log recovery failure
            await db.execute(sql `
        INSERT INTO document_upload_log (
          application_id, document_id, filename, file_size, sha256,
          status, bucket_name, storage_key, error_message, ip_address, user_agent
        ) VALUES (
          ${document.application_id}, ${document.id}, ${document.file_name}, ${document.file_size}, ${document.checksum},
          'failure', ${this.bucketName}, ${document.storage_key}, ${'Recovery failed: ' + error.message}, NULL, 'fallback-recovery-script'
        )
      `);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    getMimeType(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeTypes = {
            pdf: 'application/pdf',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            txt: 'text/plain',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        return mimeTypes[ext || ''] || 'application/octet-stream';
    }
}
async function retryFallbackUploads(documentId) {
    console.log('🚀 FALLBACK UPLOAD RECOVERY');
    console.log('='.repeat(50));
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('');
    const recovery = new FallbackRecoveryService();
    try {
        // Get fallback documents
        let query = sql `
      SELECT id, application_id, file_name, file_path, file_size, storage_key, checksum, created_at
      FROM documents 
      WHERE storage_status = 'fallback'
    `;
        if (documentId) {
            query = sql `
        SELECT id, application_id, file_name, file_path, file_size, storage_key, checksum, created_at
        FROM documents 
        WHERE storage_status = 'fallback' AND id = ${documentId}
      `;
        }
        const fallbackDocs = await db.execute(query);
        if (fallbackDocs.rows.length === 0) {
            console.log('✅ No fallback documents found to retry');
            return;
        }
        console.log(`📊 Found ${fallbackDocs.rows.length} fallback document(s) to retry`);
        console.log('');
        let successCount = 0;
        let failureCount = 0;
        const results = [];
        // Process each document
        for (const doc of fallbackDocs.rows) {
            const result = await recovery.retryFallbackUpload(doc);
            if (result.success) {
                successCount++;
                results.push({ doc, success: true });
                console.log(`✅ SUCCESS: ${doc.file_name}`);
            }
            else {
                failureCount++;
                results.push({ doc, success: false, error: result.error });
                console.log(`❌ FAILED: ${doc.file_name} - ${result.error}`);
            }
            console.log('');
        }
        // Summary report
        console.log('📈 RECOVERY SUMMARY');
        console.log('-'.repeat(30));
        console.log(`Total processed: ${fallbackDocs.rows.length}`);
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${failureCount}`);
        console.log(`📊 Success rate: ${Math.round((successCount / fallbackDocs.rows.length) * 100)}%`);
        if (failureCount > 0) {
            console.log('\n❌ FAILED DOCUMENTS:');
            results
                .filter(r => !r.success)
                .forEach(r => {
                console.log(`- ${r.doc.file_name}: ${r.error}`);
            });
        }
        if (successCount > 0) {
            console.log('\n✅ SUCCESSFULLY RECOVERED:');
            results
                .filter(r => r.success)
                .forEach(r => {
                console.log(`- ${r.doc.file_name}`);
            });
        }
    }
    catch (error) {
        console.error('❌ Recovery process failed:', error.message);
        process.exit(1);
    }
}
// Parse command line arguments
const args = process.argv.slice(2);
const documentIdArg = args.find(arg => arg.startsWith('--document-id='));
const documentId = documentIdArg?.split('=')[1];
// Run recovery if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    retryFallbackUploads(documentId)
        .then(() => {
        console.log('\n🎉 Recovery process completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Recovery process failed:', error);
        process.exit(1);
    });
}
export { retryFallbackUploads, FallbackRecoveryService };
