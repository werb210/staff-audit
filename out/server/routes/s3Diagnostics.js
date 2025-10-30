/**
 * 🔍 S3 DIAGNOSTICS ENDPOINT
 *
 * Real-time S3 configuration validation for Staff Application
 * Tests pre-signed URL generation and accessibility
 */
import express from 'express';
import { db } from '../storage.js';
import { documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { generatePreSignedDownloadUrl } from '../utils/s3PreSignedUrls.js';
const router = express.Router();
/**
 * GET /api/internal/debug/s3-status/:applicationId
 * Comprehensive S3 diagnostic for specific application
 */
router.get('/s3-status/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        console.log(`🔍 [S3-DIAGNOSTIC] Running S3 validation for application: ${applicationId}`);
        // Get all documents for this application
        const applicationDocuments = await db
            .select({
            id: documents.id,
            fileName: documents.fileName,
            storageKey: documents.storageKey,
            storage_key: documents.storage_key,
            objectStorageKey: documents.objectStorageKey,
            filePath: documents.filePath,
            fileSize: documents.fileSize
        })
            .from(documents)
            .where(eq(documents.applicationId, applicationId));
        console.log(`📋 [S3-DIAGNOSTIC] Found ${applicationDocuments.length} documents`);
        const diagnosticResults = [];
        for (const doc of applicationDocuments) {
            const result = {
                id: doc.id,
                name: doc.fileName,
                storage_key: doc.storageKey || doc.storage_key,
                object_storage_key: doc.objectStorageKey,
                file_path: doc.filePath,
                size: doc.fileSize,
                storage_type: 'unknown',
                s3_accessible: false,
                preview_url_valid: false,
                signed_url: null,
                error_message: null
            };
            // Determine storage type
            if (doc.storageKey || doc.storage_key) {
                result.storage_type = 'S3';
                try {
                    // Generate pre-signed URL
                    const s3Key = doc.storageKey || doc.storage_key;
                    console.log(`🔗 [S3-DIAGNOSTIC] Testing S3 key: ${s3Key}`);
                    const signedUrl = await generatePreSignedDownloadUrl(s3Key, 300, doc.fileName);
                    result.signed_url = signedUrl;
                    // Test URL accessibility
                    const fetch = (await import('node-fetch')).default;
                    const response = await fetch(signedUrl, { method: 'HEAD' });
                    result.s3_accessible = response.ok;
                    result.preview_url_valid = response.ok;
                    if (!response.ok) {
                        result.error_message = `HTTP ${response.status} ${response.statusText}`;
                    }
                    console.log(`📡 [S3-DIAGNOSTIC] ${doc.fileName}: ${response.status} ${response.statusText}`);
                }
                catch (error) {
                    result.error_message = error instanceof Error ? error.message : String(error);
                    console.error(`❌ [S3-DIAGNOSTIC] Error testing ${doc.fileName}:`, error instanceof Error ? error.message : String(error));
                }
            }
            else if (doc.filePath) {
                result.storage_type = 'Local';
                result.s3_accessible = false;
                result.preview_url_valid = true; // Assume local files work
            }
            else {
                result.storage_type = 'Missing';
                result.error_message = 'No storage key or file path found';
            }
            diagnosticResults.push(result);
        }
        // Summary statistics
        const summary = {
            total_documents: diagnosticResults.length,
            s3_documents: diagnosticResults.filter(d => d.storage_type === 'S3').length,
            local_documents: diagnosticResults.filter(d => d.storage_type === 'Local').length,
            missing_documents: diagnosticResults.filter(d => d.storage_type === 'Missing').length,
            s3_accessible_count: diagnosticResults.filter(d => d.s3_accessible).length,
            s3_blocked_count: diagnosticResults.filter(d => d.storage_type === 'S3' && !d.s3_accessible).length
        };
        console.log(`📊 [S3-DIAGNOSTIC] Summary:`, summary);
        res.json({
            success: true,
            applicationId: applicationId,
            summary,
            documents: diagnosticResults,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ [S3-DIAGNOSTIC] Failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/internal/debug/s3-test-single/:documentId
 * Test single document S3 access
 */
router.get('/s3-test-single/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const doc = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId))
            .limit(1);
        if (!doc.length) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        const document = doc[0];
        const s3Key = document.storageKey || document.storage_key;
        if (!s3Key) {
            return res.json({
                success: false,
                error: 'Document not in S3 storage',
                document_id: documentId,
                name: document.fileName
            });
        }
        // Generate and test pre-signed URL
        const signedUrl = await generatePreSignedDownloadUrl(s3Key, 300, document.fileName);
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(signedUrl, { method: 'HEAD' });
        res.json({
            success: true,
            document_id: documentId,
            name: document.fileName,
            storage_key: s3Key,
            signed_url: signedUrl,
            http_status: response.status,
            http_status_text: response.statusText,
            accessible: response.ok,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});
export default router;
