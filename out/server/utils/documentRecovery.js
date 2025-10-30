import { promises as fs } from 'fs';
import path from 'path';
import { db } from '../db.js';
import { documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
/**
 * Scan uploads directory and try to match orphaned files to database records
 */
export async function recoverMissingDocuments() {
    console.log('🔍 Starting document recovery process...');
    const result = {
        totalProcessed: 0,
        filesRecovered: 0,
        stillMissing: 0,
        recoveredDocuments: [],
        missingDocuments: []
    };
    try {
        // Get all documents from database that point to uploads/documents
        const allDocs = await db.select()
            .from(documents)
            .where(documents.filePath.like('uploads/documents/%'));
        console.log(`📊 Found ${allDocs.length} documents in uploads/documents path`);
        result.totalProcessed = allDocs.length;
        // Scan all files in uploads directory
        const allFiles = await scanAllFiles();
        console.log(`📁 Found ${allFiles.length} physical files in uploads`);
        // Try to match each document record with a physical file
        for (const doc of allDocs) {
            const recoveredPath = await findMatchingFile(doc, allFiles);
            if (recoveredPath) {
                // Update database with correct path
                await db.update(documents)
                    .set({ file_path: recoveredPath })
                    .where(eq(documents.id, doc.id));
                result.filesRecovered++;
                result.recoveredDocuments.push({
                    id: doc.id,
                    fileName: doc.fileName,
                    oldPath: doc.filePath,
                    newPath: recoveredPath
                });
                console.log(`✅ Recovered: ${doc.fileName} -> ${recoveredPath}`);
            }
            else {
                result.stillMissing++;
                result.missingDocuments.push({
                    id: doc.id,
                    fileName: doc.fileName,
                    expectedPath: doc.filePath
                });
                console.log(`❌ Still missing: ${doc.fileName}`);
            }
        }
        console.log(`🎯 Recovery complete: ${result.filesRecovered} recovered, ${result.stillMissing} still missing`);
        return result;
    }
    catch (error) {
        console.error('❌ Document recovery failed:', error);
        throw error;
    }
}
/**
 * Scan all files in uploads directory recursively
 */
async function scanAllFiles() {
    const files = [];
    async function scanDir(dir) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isFile()) {
                    files.push(fullPath);
                }
                else if (entry.isDirectory()) {
                    await scanDir(fullPath);
                }
            }
        }
        catch (error) {
            // Skip directories we can't read
        }
    }
    await scanDir('uploads');
    return files;
}
/**
 * Try to find a matching physical file for a database document record
 */
async function findMatchingFile(doc, allFiles) {
    const fileName = doc.fileName;
    const fileSize = doc.fileSize;
    // Strategy 1: Exact filename match
    for (const filePath of allFiles) {
        if (path.basename(filePath) === fileName) {
            // Verify file size if available
            if (fileSize) {
                try {
                    const stats = await fs.stat(filePath);
                    if (stats.size === fileSize) {
                        return filePath;
                    }
                }
                catch {
                    continue;
                }
            }
            else {
                return filePath;
            }
        }
    }
    // Strategy 2: Filename contains key parts (for renamed files)
    const baseFileName = path.parse(fileName).name;
    for (const filePath of allFiles) {
        const fileBaseName = path.parse(path.basename(filePath)).name;
        if (fileBaseName.includes(baseFileName) || baseFileName.includes(fileBaseName)) {
            // Additional check for file size
            if (fileSize) {
                try {
                    const stats = await fs.stat(filePath);
                    if (stats.size === fileSize) {
                        return filePath;
                    }
                }
                catch {
                    continue;
                }
            }
        }
    }
    // Strategy 3: Match by application ID in path
    for (const filePath of allFiles) {
        if (filePath.includes(doc.applicationId)) {
            // Check if filename is similar
            const similarity = calculateSimilarity(fileName, path.basename(filePath));
            if (similarity > 0.7) {
                return filePath;
            }
        }
    }
    return null;
}
/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0)
        return 1.0;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}
/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[str2.length][str1.length];
}
/**
 * Quick check to see how many documents can potentially be recovered
 */
export async function previewRecovery() {
    try {
        const allDocs = await db.select()
            .from(documents)
            .where(documents.filePath.like('uploads/documents/%'));
        const allFiles = await scanAllFiles();
        let canRecover = 0;
        for (const doc of allDocs) {
            const found = await findMatchingFile(doc, allFiles);
            if (found)
                canRecover++;
        }
        return {
            canRecover,
            totalMissing: allDocs.length
        };
    }
    catch (error) {
        console.error('❌ Recovery preview failed:', error);
        return { canRecover: 0, totalMissing: 0 };
    }
}
