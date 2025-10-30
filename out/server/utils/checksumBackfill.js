import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
import { createHash } from 'crypto';
import * as fs from 'fs';
/**
 * Backfill missing SHA256 checksums for documents
 */
export async function backfillChecksums() {
    console.log('🔧 [BACKFILL] Starting checksum backfill...');
    try {
        // Find documents without checksums
        const docsWithoutChecksums = await sql `
      SELECT * FROM documents WHERE checksum IS NULL
    `;
        console.log(`📊 [BACKFILL] Found ${docsWithoutChecksums.length} documents without checksums`);
        let processed = 0;
        let errors = 0;
        for (const doc of docsWithoutChecksums) {
            try {
                const filePath = `uploads/documents/${doc.id}.${doc.fileName.split('.').pop() || 'txt'}`;
                if (fs.existsSync(filePath)) {
                    const buffer = fs.readFileSync(filePath);
                    const hash = createHash('sha256').update(buffer).digest('hex');
                    await sql `
            UPDATE documents SET checksum = ${hash} WHERE id = ${doc.id}
          `;
                    console.log(`✅ [BACKFILL] Checksum added for ${doc.fileName}: ${hash.substring(0, 16)}...`);
                    processed++;
                }
                else {
                    console.log(`⚠️ [BACKFILL] File not found: ${filePath}`);
                    errors++;
                }
            }
            catch (error) {
                console.error(`❌ [BACKFILL] Error processing ${doc.fileName}:`, error);
                errors++;
            }
        }
        console.log(`🎯 [BACKFILL] Complete: ${processed} checksums added, ${errors} errors`);
        return { processed, errors, total: docsWithoutChecksums.length };
    }
    catch (error) {
        console.error('❌ [BACKFILL] Fatal error:', error);
        throw error;
    }
}
/**
 * Clean up orphaned files on disk
 */
export async function cleanupOrphanedFiles() {
    console.log('🧹 [CLEANUP] Starting orphaned file cleanup...');
    try {
        // Get all document IDs from database
        const dbDocs = await sql `SELECT id FROM documents`;
        const dbDocIds = dbDocs.map(doc => doc.id);
        // Get all files on disk
        const diskFiles = fs.readdirSync('uploads/documents/');
        const orphanedFiles = diskFiles.filter(filename => {
            const fileId = filename.split('.')[0]; // Remove extension
            return !dbDocIds.includes(fileId);
        });
        console.log(`📊 [CLEANUP] Found ${orphanedFiles.length} orphaned files out of ${diskFiles.length} total files`);
        // List orphaned files for manual review
        orphanedFiles.forEach(file => {
            console.log(`🗂️ [ORPHANED] ${file}`);
        });
        return {
            totalFiles: diskFiles.length,
            orphanedFiles: orphanedFiles.length,
            orphans: orphanedFiles
        };
    }
    catch (error) {
        console.error('❌ [CLEANUP] Error:', error);
        throw error;
    }
}
