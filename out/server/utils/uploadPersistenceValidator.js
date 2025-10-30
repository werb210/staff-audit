/**
 * 🔍 PHASE 2: UPLOAD PERSISTENCE VALIDATION
 * Validates that uploaded files are properly saved and accessible
 */
import fs from 'fs/promises';
import crypto from 'crypto';
export async function validateUploadPersistence(filePath, expectedSize, expectedChecksum, originalBuffer) {
    console.log(`🔍 [VALIDATION] Starting persistence validation for: ${filePath}`);
    try {
        // Step 1: Check if file exists and is accessible
        const stats = await fs.stat(filePath);
        const actualSize = stats.size;
        console.log(`✅ [VALIDATION] File accessible on disk: ${actualSize} bytes`);
        // Step 2: Verify file size
        if (actualSize !== expectedSize) {
            console.error(`❌ [VALIDATION] Size mismatch - Expected: ${expectedSize}, Actual: ${actualSize}`);
            return {
                success: false,
                error: `File size mismatch: expected ${expectedSize} bytes, got ${actualSize} bytes`,
                sizeVerified: false,
                actualSize,
                diskAccessible: true
            };
        }
        // Step 3: Read file and verify checksum
        const fileBuffer = await fs.readFile(filePath);
        const actualChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        console.log(`🔒 [VALIDATION] Checksum verification - Expected: ${expectedChecksum.slice(0, 16)}..., Actual: ${actualChecksum.slice(0, 16)}...`);
        if (actualChecksum !== expectedChecksum) {
            console.error(`❌ [VALIDATION] Checksum mismatch - File may be corrupted`);
            return {
                success: false,
                error: 'File checksum verification failed - file may be corrupted',
                checksumVerified: false,
                sizeVerified: true,
                actualSize,
                actualChecksum,
                diskAccessible: true
            };
        }
        // Step 4: Verify file content matches original buffer
        if (!fileBuffer.equals(originalBuffer)) {
            console.error(`❌ [VALIDATION] Content mismatch - File content doesn't match original`);
            return {
                success: false,
                error: 'File content verification failed - content doesn\'t match original',
                checksumVerified: false, // Technically should be true but content is wrong
                sizeVerified: true,
                actualSize,
                actualChecksum,
                diskAccessible: true
            };
        }
        console.log(`✅ [VALIDATION] All validation checks passed successfully`);
        return {
            success: true,
            checksumVerified: true,
            sizeVerified: true,
            actualSize,
            actualChecksum,
            diskAccessible: true
        };
    }
    catch (error) {
        console.error(`❌ [VALIDATION] File validation failed:`, error);
        return {
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown validation error',
            diskAccessible: false
        };
    }
}
export async function logUploadValidation(documentId, fileName, validation, applicationId) {
    const timestamp = new Date().toISOString();
    const status = validation.success ? 'SUCCESS' : 'FAILED';
    const logEntry = `${timestamp} | ${status} | VALIDATION | DocumentID: ${documentId}, File: ${fileName}, Application: ${applicationId}, Size: ${validation.actualSize}, Checksum: ${validation.checksumVerified}, Disk: ${validation.diskAccessible}, Error: ${validation.error || 'None'}\n`;
    try {
        await fs.appendFile('logs/upload-audit.log', logEntry);
        console.log(`📝 [VALIDATION-LOG] Validation result logged for: ${fileName}`);
    }
    catch (logError) {
        console.error(`❌ [VALIDATION-LOG] Failed to write validation log:`, logError);
    }
}
