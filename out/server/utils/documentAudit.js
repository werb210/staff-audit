import { promises as fs } from 'fs';
import path from 'path';
import { db } from '../db.js';
import { documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
/**
 * Audit all documents in the database vs file system
 */
export async function auditAllDocuments() {
    console.log('🔍 Starting comprehensive document audit...');
    try {
        // Get all document records from database
        const allDocuments = await db.select().from(documents);
        console.log(`📊 Found ${allDocuments.length} document records in database`);
        const missingDocuments = [];
        let filesFound = 0;
        // Check each document
        for (const doc of allDocuments) {
            const exists = await checkFileExists(doc.filePath);
            if (exists) {
                filesFound++;
            }
            else {
                missingDocuments.push({
                    id: doc.id,
                    fileName: doc.fileName,
                    filePath: doc.filePath,
                    applicationId: doc.applicationId,
                    createdAt: doc.createdAt?.toISOString() || 'Unknown'
                });
            }
        }
        // Find orphaned files (files without database records)
        const orphanedFiles = await findOrphanedFiles();
        const result = {
            totalDocuments: allDocuments.length,
            filesFound,
            filesMissing: missingDocuments.length,
            missingDocuments,
            orphanedFiles,
            summary: `Audit complete: ${filesFound}/${allDocuments.length} files found, ${missingDocuments.length} missing, ${orphanedFiles.length} orphaned`
        };
        console.log(`✅ ${result.summary}`);
        return result;
    }
    catch (error) {
        console.error('❌ Document audit failed:', error);
        throw error;
    }
}
/**
 * Check if a file exists at the given path
 */
async function checkFileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Find files in uploads directory that don't have database records
 */
async function findOrphanedFiles() {
    const orphaned = [];
    try {
        // Get all document file paths from database
        const dbPaths = await db.select({ filePath: documents.filePath }).from(documents);
        const dbPathSet = new Set(dbPaths.map(p => p.filePath));
        // Recursively scan uploads directory
        const allFiles = await scanDirectory('uploads');
        // Find files not in database
        for (const filePath of allFiles) {
            if (!dbPathSet.has(filePath) && !filePath.includes('test') && !filePath.includes('temp')) {
                orphaned.push(filePath);
            }
        }
    }
    catch (error) {
        console.error('❌ Error finding orphaned files:', error);
    }
    return orphaned;
}
/**
 * Recursively scan directory for all files
 */
async function scanDirectory(dir) {
    const files = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile()) {
                files.push(fullPath);
            }
            else if (entry.isDirectory()) {
                const subFiles = await scanDirectory(fullPath);
                files.push(...subFiles);
            }
        }
    }
    catch (error) {
        // Skip directories we can't read
    }
    return files;
}
/**
 * Audit documents for a specific application
 */
export async function auditApplicationDocuments(applicationId) {
    console.log(`🔍 Auditing documents for application: ${applicationId}`);
    try {
        // Get documents for this application
        const appDocuments = await db.select()
            .from(documents)
            .where(eq(documents.applicationId, applicationId));
        const missingDocuments = [];
        let filesFound = 0;
        for (const doc of appDocuments) {
            const exists = await checkFileExists(doc.filePath);
            if (exists) {
                filesFound++;
            }
            else {
                missingDocuments.push({
                    id: doc.id,
                    fileName: doc.fileName,
                    filePath: doc.filePath,
                    applicationId: doc.applicationId,
                    createdAt: doc.createdAt?.toISOString() || 'Unknown'
                });
            }
        }
        const result = {
            totalDocuments: appDocuments.length,
            filesFound,
            filesMissing: missingDocuments.length,
            missingDocuments,
            orphanedFiles: [], // Not applicable for single application audit
            summary: `Application ${applicationId}: ${filesFound}/${appDocuments.length} files found, ${missingDocuments.length} missing`
        };
        console.log(`✅ ${result.summary}`);
        return result;
    }
    catch (error) {
        console.error(`❌ Application document audit failed for ${applicationId}:`, error);
        throw error;
    }
}
