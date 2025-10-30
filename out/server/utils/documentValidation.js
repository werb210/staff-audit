import crypto from 'crypto';
import fs from 'fs';
import { db } from '../db.js';
import { documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { downloadDocumentBuffer } from './documentBuffer.js';
/**
 * Phase 3 Feature 1: SHA256 Validation System
 * Calculate and validate document checksums for integrity verification
 */
/**
 * Calculate SHA256 hash of file buffer
 */
export function calculateSHA256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
/**
 * Calculate SHA256 hash of file on disk
 */
export function calculateFileSHA256(filePath) {
    console.log(`🔐 [SHA256] Calculating hash for file: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const buffer = fs.readFileSync(filePath);
    const hash = calculateSHA256(buffer);
    console.log(`✅ [SHA256] Hash calculated: ${hash.substring(0, 16)}...`);
    return hash;
}
/**
 * Validate document checksum against stored value
 */
export async function validateChecksum(documentId) {
    console.log(`🔐 [VALIDATE] Starting checksum validation for document: ${documentId}`);
    try {
        // Get document record
        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId));
        if (!document) {
            return {
                valid: false,
                storedHash: null,
                calculatedHash: null,
                source: 'missing',
                error: 'Document not found in database'
            };
        }
        const storedHash = document.sha256;
        if (!storedHash) {
            console.log(`⚠️ [VALIDATE] No stored hash for document: ${documentId}`);
            return {
                valid: false,
                storedHash: null,
                calculatedHash: null,
                source: 'missing',
                error: 'No stored hash available'
            };
        }
        let calculatedHash;
        let source;
        // Try to calculate hash from disk first
        if (document.filePath && fs.existsSync(document.filePath)) {
            calculatedHash = calculateFileSHA256(document.filePath);
            source = 'disk';
            console.log(`✅ [VALIDATE] Hash calculated from disk file`);
        }
        else if (document.storageKey) {
            // Try object storage
            try {
                console.log(`🔍 [VALIDATE] Attempting to validate from object storage...`);
                const buffer = await downloadDocumentBuffer(document.storageKey);
                calculatedHash = calculateSHA256(buffer);
                source = 'object_storage';
                console.log(`✅ [VALIDATE] Hash calculated from object storage`);
            }
            catch (error) {
                console.log(`❌ [VALIDATE] Object storage validation failed: ${error}`);
                return {
                    valid: false,
                    storedHash,
                    calculatedHash: null,
                    source: 'missing',
                    error: 'File not accessible from disk or object storage'
                };
            }
        }
        else {
            return {
                valid: false,
                storedHash,
                calculatedHash: null,
                source: 'missing',
                error: 'No file path or storage key available'
            };
        }
        const valid = storedHash === calculatedHash;
        if (valid) {
            console.log(`✅ [VALIDATE] Checksum validation PASSED for ${documentId}`);
        }
        else {
            console.log(`❌ [VALIDATE] Checksum validation FAILED for ${documentId}`);
            console.log(`   Stored:     ${storedHash}`);
            console.log(`   Calculated: ${calculatedHash}`);
            // Log corruption event
            await logRecoveryEvent(documentId, 'corruption_detected', null, `Checksum mismatch - stored: ${storedHash.substring(0, 8)}, calculated: ${calculatedHash.substring(0, 8)}`);
        }
        return {
            valid,
            storedHash,
            calculatedHash,
            source
        };
    }
    catch (error) {
        console.error(`❌ [VALIDATE] Error validating checksum for ${documentId}:`, error);
        return {
            valid: false,
            storedHash: null,
            calculatedHash: null,
            source: 'missing',
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        };
    }
}
/**
 * Phase 3 Feature 4: Recovery Event Logging
 * Log document recovery, regeneration, and restoration operations
 */
export async function logRecoveryEvent(documentId, eventType, userId, notes, previousStatus, newStatus) {
    try {
        console.log(`📋 [RECOVERY LOG] ${eventType.toUpperCase()}: ${documentId} - ${notes}`);
        await db.insert( /* documentRecoveryLog */).values({
            document_id: documentId,
            event_type: eventType,
            user_id: userId,
            notes,
            previous_status: previousStatus,
            new_status: newStatus,
            timestamp: new Date()
        });
        console.log(`✅ [RECOVERY LOG] Event logged successfully`);
    }
    catch (error) {
        console.error(`❌ [RECOVERY LOG] Failed to log event:`, error);
    }
}
/**
 * Validate multiple documents and return health report
 */
export async function validateMultipleDocuments(documentIds) {
    console.log(`🔐 [BATCH VALIDATE] Starting validation of ${documentIds.length} documents`);
    const results = [];
    let valid = 0;
    let invalid = 0;
    let missing = 0;
    for (const documentId of documentIds) {
        try {
            // Get document info
            const [document] = await db
                .select()
                .from(documents)
                .where(eq(documents.id, documentId));
            const validation = await validateChecksum(documentId);
            if (validation.valid) {
                valid++;
            }
            else if (validation.source === 'missing') {
                missing++;
            }
            else {
                invalid++;
            }
            results.push({
                documentId,
                fileName: document?.fileName || 'Unknown',
                valid: validation.valid,
                source: validation.source,
                error: validation.error
            });
        }
        catch (error) {
            missing++;
            results.push({
                documentId,
                fileName: 'Unknown',
                valid: false,
                source: 'missing',
                error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
            });
        }
    }
    console.log(`📊 [BATCH VALIDATE] Results: ${valid} valid, ${invalid} corrupted, ${missing} missing`);
    return {
        total: documentIds.length,
        valid,
        invalid,
        missing,
        results
    };
}
