import fs from 'fs';
import path from 'path';
/**
 * Check if a document file exists on disk
 * @param filePath - The file path stored in the database
 * @param applicationId - The application ID to help locate the file
 * @param fileName - The original file name
 * @returns Promise<boolean> - true if file exists and is accessible
 */
export async function checkDocumentAccessible(filePath, applicationId, fileName) {
    if (!filePath)
        return false;
    try {
        // Primary path check
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        await fs.promises.access(fullPath, fs.constants.R_OK);
        console.log(`🟢 Found document at primary path: ${fullPath}`);
        return true;
    }
    catch {
        // Try application-specific directory structure which is the main storage pattern
        const fileBaseName = fileName || path.basename(filePath);
        // Extract potential application ID from file path or use provided applicationId
        const pathParts = filePath.split('/');
        const possibleAppId = applicationId || pathParts.find(part => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part));
        const alternativePaths = [
            // Primary pattern: uploads/{applicationId}/{filename} - this is where files actually are
            possibleAppId ? `uploads/${possibleAppId}/${fileBaseName}` : null,
            // Search for files that start with applicationId (prefixed filenames)
            possibleAppId ? `uploads/${possibleAppId}/${possibleAppId}_${fileBaseName}` : null,
            // Legacy patterns
            filePath.replace('uploads/documents/', 'uploads/'),
            filePath.replace('uploads/documents/', 'uploads/applications/'),
            // Direct uploads directory
            `uploads/${fileBaseName}`,
            // Documents subdirectory
            `uploads/documents/${fileBaseName}`,
            // Applications subdirectory  
            possibleAppId ? `uploads/applications/${possibleAppId}/${fileBaseName}` : null
        ].filter(Boolean);
        console.log(`🔍 Searching for document ${fileBaseName} in ${alternativePaths.length} locations for app ${possibleAppId?.substring(0, 8)}...`);
        for (const altPath of alternativePaths) {
            try {
                const fullAltPath = path.isAbsolute(altPath) ? altPath : path.join(process.cwd(), altPath);
                await fs.promises.access(fullAltPath, fs.constants.R_OK);
                console.log(`🟢 Found document at alternative path: ${fullAltPath}`);
                return true;
            }
            catch {
                // Continue to next path
            }
        }
        // Aggressive recursive search as last resort
        if (possibleAppId && fileName) {
            try {
                const found = await recursiveFileSearch(fileName, 'uploads');
                if (found) {
                    console.log(`🟢 Found document via recursive search: ${found}`);
                    return true;
                }
            }
            catch (e) {
                // Ignore recursive search errors
            }
        }
        console.log(`🔴 Document not found: ${fileBaseName} (searched ${alternativePaths.length} paths)`);
        return false;
    }
}
/**
 * Recursive file search in directory
 */
async function recursiveFileSearch(fileName, searchDir) {
    try {
        const items = await fs.promises.readdir(searchDir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(searchDir, item.name);
            if (item.isFile() && (item.name === fileName || item.name.includes(fileName))) {
                return fullPath;
            }
            else if (item.isDirectory()) {
                const found = await recursiveFileSearch(fileName, fullPath);
                if (found)
                    return found;
            }
        }
    }
    catch {
        // Directory doesn't exist or can't be read
    }
    return null;
}
/**
 * Filter documents to only include those with accessible files
 * @param documents - Array of document records from database
 * @returns Promise<Array> - Filtered array with only accessible documents
 */
export async function filterAccessibleDocuments(documents) {
    const accessibilityChecks = await Promise.all(documents.map(async (doc) => {
        const isAccessible = await checkDocumentAccessible(doc.filePath || doc.filePath, doc.applicationId || doc.applicationId, doc.fileName || doc.fileName);
        return { ...doc, isAccessible };
    }));
    // Filter out documents that are not accessible
    const accessibleDocs = accessibilityChecks.filter(doc => doc.isAccessible);
    // Log filtering results
    const filteredCount = documents.length - accessibleDocs.length;
    if (filteredCount > 0) {
        console.log(`🗂️ Filtered out ${filteredCount} inaccessible documents from display`);
    }
    return accessibleDocs.map(({ isAccessible, ...doc }) => doc);
}
