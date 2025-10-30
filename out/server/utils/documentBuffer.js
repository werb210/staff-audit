import { Client } from '@replit/object-storage';
import crypto from 'crypto';
// Replit Object Storage client - initialized on first use
let storageClient = null;
let clientInitialized = false;
function getStorageClient() {
    if (clientInitialized) {
        return storageClient;
    }
    try {
        storageClient = new Client();
        console.log('✅ [DOCUMENT BUFFER] Storage client initialized successfully');
    }
    catch (error) {
        console.warn('⚠️ [DOCUMENT BUFFER] Object Storage client initialization failed, using local-only mode:', error instanceof Error ? error instanceof Error ? error.message : String(error) : error);
        storageClient = null;
    }
    clientInitialized = true;
    return storageClient;
}
/**
 * Upload document buffer directly to Replit Object Storage with MIME preservation
 */
export async function uploadDocumentBuffer(documentId, buffer, contentType = 'application/pdf') {
    const key = `documents/${documentId}.pdf`;
    const storageClient = getStorageClient();
    if (!storageClient) {
        console.warn(`⚠️ [OBJECT STORAGE] Client not available, skipping upload: ${key}`);
        return `local-only-${key}`;
    }
    try {
        await storageClient.uploadFromBytes(key, buffer);
        console.log(`📦 [OBJECT STORAGE] Uploaded document buffer: ${key} (${buffer.length} bytes)`);
        return key;
    }
    catch (error) {
        console.error(`❌ [OBJECT STORAGE] Failed to upload ${key}:`, error);
        console.warn(`⚠️ [OBJECT STORAGE] Continuing with local-only storage`);
        return `local-fallback-${key}`;
    }
}
/**
 * Download document buffer from Replit Object Storage
 */
export async function downloadDocumentBuffer(storageKey) {
    const storageClient = getStorageClient();
    if (!storageClient || storageKey.startsWith('local-')) {
        console.log(`⚠️ [OBJECT STORAGE] Client not available or local-only key: ${storageKey}`);
        return null;
    }
    try {
        const result = await storageClient.downloadAsBytes(storageKey);
        if (result) {
            console.log(`📦 [OBJECT STORAGE] Downloaded document: ${storageKey}`);
            return Buffer.from(result);
        }
        return null;
    }
    catch (error) {
        console.error(`❌ [OBJECT STORAGE] Failed to download ${storageKey}:`, error);
        return null;
    }
}
/**
 * Compute SHA256 checksum for document integrity
 */
export function computeChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
/**
 * Validate document buffer integrity
 */
export function validateBufferIntegrity(buffer, expectedChecksum) {
    const actualChecksum = computeChecksum(buffer);
    return actualChecksum === expectedChecksum;
}
