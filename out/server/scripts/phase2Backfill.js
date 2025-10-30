#!/usr/bin/env tsx
/**
 * PHASE 2: Retroactive Backfill and Cleanup Script
 *
 * This script will:
 * 1. Add missing SHA256 checksums to existing documents
 * 2. Add missing object storage keys (re-upload if needed)
 * 3. Detect and clean up orphaned files
 * 4. Create placeholders for missing documents from Application #893777fb
 */
import fs from 'fs/promises';
import path from 'path';
import { db } from '../database.js';
import { documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { computeChecksum } from '../utils/checksumUtils.js';
const UPLOADS_DIR = './uploads/documents';
const APPLICATION_ID = '893777fb-0830-4233-8768-0d1044ff8275';
// Missing document IDs from the critical incident
const MISSING_DOCS = [
    { id: '48800dac-c451-4021-8bf7-6b3e5462efe0', filename: 'November 2024.pdf' },
    { id: '964513c3-0e72-4661-9af7-ae995350dc1f', filename: 'December 2024.pdf' },
    { id: '59a34886-2fa2-45f3-b353-6c9e97cfb5fb', filename: 'February 2025.pdf' },
    { id: 'c17b930c-c01f-4e7b-9d92-b0b6173cb350', filename: 'January 2025.pdf' },
    { id: 'bb868f74-89b8-44ff-a52f-3dedec6568a9', filename: 'March 2025.pdf' },
    { id: 'bba27786-b13e-4397-aab2-4c39b1995ef2', filename: 'April 2025.pdf' }
];
async function main() {
    console.log('🔧 [PHASE 2] Starting retroactive backfill and cleanup...\n');
    // Step 1: Backfill missing SHA256 checksums
    await backfillChecksums();
    // Step 2: Backfill missing object storage keys
    await backfillStorageKeys();
    // Step 3: Clean up orphaned files
    await cleanupOrphanedFiles();
    // Step 4: Create placeholders for missing critical documents
    await createMissingDocumentPlaceholders();
    console.log('\n✅ [PHASE 2] Retroactive backfill and cleanup completed!');
}
async function backfillChecksums() {
    console.log('📊 [CHECKSUM BACKFILL] Scanning for missing checksums...');
    const docsWithoutChecksums = await db
        .select()
        .from(documents)
        .where(eq(documents.checksum, null));
    console.log(`Found ${docsWithoutChecksums.length} documents missing checksums`);
    let successCount = 0;
    let failureCount = 0;
    for (const doc of docsWithoutChecksums) {
        try {
            const filePath = path.join(UPLOADS_DIR, `${doc.id}.pdf`);
            // Check if file exists
            try {
                await fs.access(filePath);
            }
            catch {
                console.log(`⚠️ [CHECKSUM] File not found for checksum: ${doc.fileName} (${doc.id})`);
                failureCount++;
                continue;
            }
            // Read file and compute checksum
            const fileBuffer = await fs.readFile(filePath);
            const checksum = computeChecksum(fileBuffer);
            // Update database
            await db
                .update(documents)
                .set({ checksum })
                .where(eq(documents.id, doc.id));
            console.log(`✅ [CHECKSUM] Added checksum to ${doc.fileName}: ${checksum.substring(0, 16)}...`);
            successCount++;
        }
        catch (error) {
            console.error(`❌ [CHECKSUM] Failed to process ${doc.fileName}:`, error.message);
            failureCount++;
        }
    }
    console.log(`📊 [CHECKSUM BACKFILL] Complete: ${successCount} success, ${failureCount} failures\n`);
}
async function backfillStorageKeys() {
    console.log('☁️ [STORAGE BACKFILL] Scanning for missing storage keys...');
    const docsWithoutStorage = await db
        .select()
        .from(documents)
        .where(eq(documents.storageKey, null));
    console.log(`Found ${docsWithoutStorage.length} documents missing storage keys`);
    let successCount = 0;
    let failureCount = 0;
    for (const doc of docsWithoutStorage) {
        try {
            const filePath = path.join(UPLOADS_DIR, `${doc.id}.pdf`);
            // Check if file exists
            try {
                await fs.access(filePath);
            }
            catch {
                console.log(`⚠️ [STORAGE] File not found for upload: ${doc.fileName} (${doc.id})`);
                failureCount++;
                continue;
            }
            // Read file and upload to storage
            const fileBuffer = await fs.readFile(filePath);
            try {
                const { uploadToStorage } = await import('../utils/objectStorage.js');
                const storageKey = await uploadToStorage(fileBuffer, doc.fileName);
                if (storageKey) {
                    // Update database
                    await db
                        .update(documents)
                        .set({ storageKey })
                        .where(eq(documents.id, doc.id));
                    console.log(`✅ [STORAGE] Uploaded ${doc.fileName}: ${storageKey}`);
                    successCount++;
                }
                else {
                    throw new Error('No storage key returned');
                }
            }
            catch (storageError) {
                console.error(`❌ [STORAGE] Upload failed for ${doc.fileName}:`, storageError.message);
                failureCount++;
            }
        }
        catch (error) {
            console.error(`❌ [STORAGE] Failed to process ${doc.fileName}:`, error.message);
            failureCount++;
        }
    }
    console.log(`📊 [STORAGE BACKFILL] Complete: ${successCount} success, ${failureCount} failures\n`);
}
async function cleanupOrphanedFiles() {
    console.log('🧹 [ORPHAN CLEANUP] Scanning for orphaned files...');
    try {
        const files = await fs.readdir(UPLOADS_DIR);
        const orphanedFiles = [];
        for (const file of files) {
            if (file === '.' || file === '..')
                continue;
            // Extract UUID from filename (remove extension)
            const fileId = file.replace(/\.[^/.]+$/, '');
            // Check if this ID exists in database
            const dbRecord = await db
                .select()
                .from(documents)
                .where(eq(documents.id, fileId))
                .limit(1);
            if (dbRecord.length === 0) {
                orphanedFiles.push(file);
                console.log(`🗑️ [ORPHAN] Found orphaned file: ${file}`);
            }
        }
        console.log(`Found ${orphanedFiles.length} orphaned files`);
        // Log all orphaned files before cleanup
        if (orphanedFiles.length > 0) {
            console.log('📝 [ORPHAN] Logging orphaned files for audit:');
            for (const file of orphanedFiles) {
                console.log(`   - ${file}`);
            }
            // Clean up orphaned files
            let cleanupCount = 0;
            for (const file of orphanedFiles) {
                try {
                    await fs.unlink(path.join(UPLOADS_DIR, file));
                    console.log(`🗑️ [ORPHAN] Deleted: ${file}`);
                    cleanupCount++;
                }
                catch (error) {
                    console.error(`❌ [ORPHAN] Failed to delete ${file}:`, error.message);
                }
            }
            console.log(`📊 [ORPHAN CLEANUP] Complete: ${cleanupCount} files removed`);
        }
        else {
            console.log('✅ [ORPHAN CLEANUP] No orphaned files found');
        }
    }
    catch (error) {
        console.error('❌ [ORPHAN CLEANUP] Failed:', error.message);
    }
    console.log('');
}
async function createMissingDocumentPlaceholders() {
    console.log('📄 [PLACEHOLDER] Creating placeholders for missing critical documents...');
    let createdCount = 0;
    for (const missingDoc of MISSING_DOCS) {
        try {
            const placeholderContent = `PLACEHOLDER DOCUMENT - FILE LOST IN DATA LOSS INCIDENT

Document Information:
- Original Filename: ${missingDoc.filename}
- Document ID: ${missingDoc.id}
- Application ID: ${APPLICATION_ID}
- Data Loss Date: July 20, 2025
- Recovery Status: REQUIRES CLIENT RE-UPLOAD

CRITICAL NOTICE:
This is a placeholder file created after a critical data loss incident.
The original document (${missingDoc.filename}) was lost from disk storage
despite successful database recording.

ACTION REQUIRED:
- Contact client immediately for document re-upload
- Use the re-upload functionality in the staff interface
- Original document contained bank statement data

Recovery Instructions:
1. Contact client at the email address associated with this application
2. Request re-upload of ${missingDoc.filename}
3. Use document re-upload feature in staff interface
4. Verify new upload has proper backup and checksum

Generated: ${new Date().toISOString()}
System: Document Recovery System v2.0`;
            const placeholderPath = path.join(UPLOADS_DIR, `${missingDoc.id}.txt`);
            // Create placeholder file
            await fs.writeFile(placeholderPath, placeholderContent, 'utf-8');
            console.log(`📄 [PLACEHOLDER] Created: ${missingDoc.filename} -> ${missingDoc.id}.txt`);
            // Update database to mark as placeholder and missing
            await db
                .update(documents)
                .set({
                filePath: `uploads/documents/${missingDoc.id}.txt`,
                fileSize: Buffer.byteLength(placeholderContent, 'utf-8'),
                checksum: computeChecksum(Buffer.from(placeholderContent, 'utf-8')),
                updatedAt: new Date()
            })
                .where(eq(documents.id, missingDoc.id));
            console.log(`💾 [PLACEHOLDER] Updated database for ${missingDoc.filename}`);
            createdCount++;
        }
        catch (error) {
            console.error(`❌ [PLACEHOLDER] Failed to create ${missingDoc.filename}:`, error.message);
        }
    }
    console.log(`📊 [PLACEHOLDER] Complete: ${createdCount} placeholders created\n`);
}
// Run the script
main().catch(console.error);
