import { createHash } from "crypto";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { S3_CONFIG } from "../config/s3Config";
import { db } from "../db";
import { documents } from "../../shared/schema";
import { eq } from "drizzle-orm";
/**
 * Compute SHA256 hash from buffer
 */
export function computeSHA256(buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}
/**
 * Store document to S3 with SHA256 versioning
 */
export async function storeDocumentToS3WithVersioning(documentId, file) {
    console.log(`📁 [VERSIONING] Processing document ${documentId} with SHA256 versioning`);
    // Compute SHA256 hash
    const hash = computeSHA256(file.buffer);
    const fileSize = file.buffer.length;
    // Create versioned storage key: applicationId/documentId-hash.ext
    const fileExtension = file.originalname.split('.').pop() || 'bin';
    const versionedKey = `${documentId}/${documentId}-${hash.substring(0, 12)}.${fileExtension}`;
    console.log(`🔐 [VERSIONING] SHA256: ${hash}`);
    console.log(`📂 [VERSIONING] Storage key: ${versionedKey}`);
    try {
        // Import S3 client dynamically to avoid import issues
        const { s3Client } = await import("../config/s3Config");
        // Check if this exact version already exists in S3
        const headCommand = new GetObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: versionedKey
        });
        try {
            await s3Client.send(headCommand);
            console.log(`♻️  [VERSIONING] File with hash ${hash.substring(0, 12)} already exists - skipping upload`);
        }
        catch (notFoundError) {
            // File doesn't exist, proceed with upload
            console.log(`📤 [VERSIONING] Uploading new version to S3`);
            const uploadCommand = new PutObjectCommand({
                Bucket: S3_CONFIG.bucket,
                Key: versionedKey,
                Body: file.buffer,
                ContentType: file.mimetype,
                ServerSideEncryption: "AES256",
                Metadata: {
                    'original-filename': file.originalname,
                    'document-id': documentId,
                    'hash-sha256': hash,
                    'upload-timestamp': new Date().toISOString()
                }
            });
            const { s3Client: s3ClientForUpload } = await import("../config/s3Config");
            await s3ClientForUpload.send(uploadCommand);
            console.log(`✅ [VERSIONING] Successfully uploaded to S3: ${versionedKey}`);
        }
        return {
            storageKey: versionedKey,
            hash: hash,
            fileSize: fileSize
        };
    }
    catch (error) {
        console.error(`❌ [VERSIONING] Error storing document to S3:`, error);
        throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Store document with complete versioning workflow
 */
export async function storeDocumentWithVersioning(applicationId, file, documentType) {
    console.log(`🎯 [VERSIONING] Starting versioned document storage workflow`);
    try {
        // Generate document ID
        const { v4: uuidv4 } = await import('uuid');
        const documentId = uuidv4();
        // Store to S3 with versioning
        const { storageKey, hash, fileSize } = await storeDocumentToS3WithVersioning(documentId, file);
        // Store in database with versioning metadata
        await db.insert(documents).values({
            id: documentId,
            applicationId: applicationId,
            fileName: file.originalname,
            documentType: documentType,
            storageKey: storageKey,
            checksum: hash,
            fileSize: fileSize,
            uploadedAt: new Date(),
            filePath: storageKey // For backward compatibility
        });
        console.log(`✅ [VERSIONING] Document stored successfully: ${documentId}`);
        console.log(`📊 [VERSIONING] File: ${file.originalname}, Size: ${fileSize} bytes, Hash: ${hash.substring(0, 12)}`);
        // TODO: Create document version entry if versions table exists
        // await createDocumentVersion(documentId, hash, storageKey);
        return documentId;
    }
    catch (error) {
        console.error(`❌ [VERSIONING] Error in versioned storage workflow:`, error);
        throw error;
    }
}
/**
 * Re-upload existing document with new version
 */
export async function reuploadDocumentWithVersioning(documentId, file) {
    console.log(`🔄 [REUPLOAD] Re-uploading document ${documentId} with versioning`);
    try {
        // Get existing document
        const [existingDoc] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId))
            .limit(1);
        if (!existingDoc) {
            throw new Error(`Document not found: ${documentId}`);
        }
        // Store new version to S3
        const { storageKey, hash, fileSize } = await storeDocumentToS3WithVersioning(documentId, file);
        // Update database record
        await db
            .update(documents)
            .set({
            fileName: file.originalname,
            storageKey: storageKey,
            checksum: hash,
            fileSize: fileSize,
            uploadedAt: new Date(),
            filePath: storageKey // Update filePath for compatibility
        })
            .where(eq(documents.id, documentId));
        console.log(`✅ [REUPLOAD] Document re-uploaded successfully`);
        console.log(`📊 [REUPLOAD] New hash: ${hash.substring(0, 12)}, Size: ${fileSize} bytes`);
        return {
            success: true,
            newStorageKey: storageKey,
            hash: hash
        };
    }
    catch (error) {
        console.error(`❌ [REUPLOAD] Error re-uploading document:`, error);
        throw error;
    }
}
/**
 * Get document version history (if versions table exists)
 */
export async function getDocumentVersions(documentId) {
    // TODO: Implement when document_versions table is created
    console.log(`📚 [VERSIONS] Version history lookup for ${documentId} - feature coming soon`);
    return [];
}
/**
 * Create document version entry (placeholder for future implementation)
 */
export async function createDocumentVersion(documentId, hash, storageKey) {
    console.log(`📝 [VERSION] Creating version entry for ${documentId} with hash ${hash.substring(0, 12)} - feature coming soon`);
    // TODO: Implement when document_versions table is created
}
/**
 * Get document version history (alias for compatibility)
 */
export async function getDocumentVersionHistory(documentId) {
    return getDocumentVersions(documentId);
}
/**
 * Restore document version (placeholder for future implementation)
 */
export async function restoreDocumentVersion(documentId, versionHash) {
    console.log(`🔄 [RESTORE] Restoring document ${documentId} to version ${versionHash.substring(0, 12)} - feature coming soon`);
    // TODO: Implement when document_versions table is created
}
/**
 * Cleanup old document versions (placeholder for future implementation)
 */
export async function cleanupOldVersions(documentId) {
    console.log(`🧹 [CLEANUP] Old version cleanup for ${documentId || 'all documents'} - feature coming soon`);
    // TODO: Implement when document_versions table is created
}
