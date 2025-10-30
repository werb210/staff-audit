/**
 * BULLETPROOF DOCUMENT UPLOAD API
 * Implements bulletproof upload with local + S3 backup
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { bulletproofUploadDocument } from '../services/bulletproofUploadService';
const router = express.Router();
// Configure multer for disk storage (consistent with all other endpoints)
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(process.cwd(), 'uploads', 'documents');
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueId = uuidv4();
            const extension = path.extname(file.originalname);
            cb(null, `${uniqueId}${extension}`);
        }
    }),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common document types
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    }
});
/**
 * POST /api/bulletproof/upload/:applicationId
 * Bulletproof document upload endpoint
 */
router.post('/upload/:applicationId', upload.single('document'), async (req, res) => {
    console.log(`🚀 [BULLETPROOF API] Upload request for application: ${req.params.applicationId}`);
    try {
        const { applicationId } = req.params;
        const { documentType } = req.body;
        const file = req.file;
        // Validate request
        if (!file) {
            console.log(`❌ [BULLETPROOF API] No file provided`);
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        if (!documentType) {
            console.log(`❌ [BULLETPROOF API] No document type provided`);
            return res.status(400).json({
                success: false,
                error: 'Document type is required'
            });
        }
        // Validate file size (minimum 100 bytes)
        if (file.buffer.length < 100) {
            console.log(`❌ [BULLETPROOF API] File too small: ${file.buffer.length} bytes`);
            return res.status(400).json({
                success: false,
                error: 'File must be at least 100 bytes'
            });
        }
        console.log(`📄 [BULLETPROOF API] Processing file: ${file.originalname}`);
        console.log(`📄 [BULLETPROOF API] Size: ${file.buffer.length} bytes`);
        console.log(`📄 [BULLETPROOF API] Type: ${documentType}`);
        // Use bulletproof upload service
        const result = await bulletproofUploadDocument(file.buffer, file.originalname, documentType, applicationId, 'public-api' // TODO: Use actual user ID when auth is implemented
        );
        if (result.success) {
            console.log(`✅ [BULLETPROOF API] Upload successful: ${result.documentId}`);
            res.json({
                success: true,
                documentId: result.documentId,
                fileName: file.originalname,
                category: documentType,
                message: 'Document uploaded successfully with bulletproof backup'
            });
        }
        else {
            console.log(`❌ [BULLETPROOF API] Upload failed: ${result.error}`);
            res.status(500).json({
                success: false,
                error: result.error || 'Upload failed'
            });
        }
    }
    catch (error) {
        console.error('💥 [BULLETPROOF API] Unexpected error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Internal server error'
        });
    }
});
/**
 * GET /api/bulletproof/documents/:id/preview
 * Preview document (inline)
 */
router.get('/documents/:id/preview', async (req, res) => {
    const { id } = req.params;
    console.log(`👁️ [BULLETPROOF API] Preview request for: ${id}`);
    try {
        const { getDocumentFile } = await import('../services/bulletproofUploadService');
        const fileData = await getDocumentFile(id);
        if (!fileData) {
            console.log(`❌ [BULLETPROOF API] Document not found: ${id}`);
            return res.status(404).json({ error: 'Document not found' });
        }
        // Set headers for inline preview
        res.setHeader('Content-Type', fileData.mimeType);
        res.setHeader('Content-Length', fileData.fileSize.toString());
        res.setHeader('Content-Disposition', `inline; filename="${fileData.fileName}"`);
        console.log(`✅ [BULLETPROOF API] Serving preview: ${fileData.fileName}`);
        // Stream the file
        fileData.stream.pipe(res);
    }
    catch (error) {
        console.error(`💥 [BULLETPROOF API] Preview error for ${id}:`, error);
        res.status(500).json({ error: 'Failed to retrieve document' });
    }
});
/**
 * GET /api/bulletproof/documents/:id/download
 * Download document (attachment)
 */
router.get('/documents/:id/download', async (req, res) => {
    const { id } = req.params;
    console.log(`⬇️ [BULLETPROOF API] Download request for: ${id}`);
    try {
        const { getDocumentFile } = await import('../services/bulletproofUploadService');
        const fileData = await getDocumentFile(id);
        if (!fileData) {
            console.log(`❌ [BULLETPROOF API] Document not found: ${id}`);
            return res.status(404).json({ error: 'Document not found' });
        }
        // Set headers for download
        res.setHeader('Content-Type', fileData.mimeType);
        res.setHeader('Content-Length', fileData.fileSize.toString());
        res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
        console.log(`✅ [BULLETPROOF API] Serving download: ${fileData.fileName}`);
        // Stream the file
        fileData.stream.pipe(res);
    }
    catch (error) {
        console.error(`💥 [BULLETPROOF API] Download error for ${id}:`, error);
        res.status(500).json({ error: 'Failed to retrieve document' });
    }
});
/**
 * GET /api/bulletproof/health
 * System health check
 */
router.get('/health', async (req, res) => {
    console.log(`🔍 [BULLETPROOF API] Health check requested`);
    try {
        const { db } = await import('../db');
        const { documents } = await import('../../shared/schema');
        const { count, eq } = await import('drizzle-orm');
        // Get document statistics
        const [totalDocs] = await db.select({ count: count() }).from(documents);
        const [pendingBackups] = await db.select({ count: count() }).from(documents).where(eq(documents.backupStatus, 'pending'));
        const [failedBackups] = await db.select({ count: count() }).from(documents).where(eq(documents.backupStatus, 'failed'));
        const [completedBackups] = await db.select({ count: count() }).from(documents).where(eq(documents.backupStatus, 'completed'));
        const healthData = {
            success: true,
            timestamp: new Date().toISOString(),
            statistics: {
                totalDocuments: totalDocs.count,
                pendingBackups: pendingBackups.count,
                failedBackups: failedBackups.count,
                completedBackups: completedBackups.count,
                backupSuccessRate: totalDocs.count > 0
                    ? Math.round((completedBackups.count / totalDocs.count) * 100)
                    : 0
            },
            status: {
                uploadSystem: 'operational',
                backupSystem: failedBackups.count === 0 ? 'healthy' : 'degraded',
                storageSystem: 'operational'
            }
        };
        console.log(`✅ [BULLETPROOF API] Health check completed`);
        res.json(healthData);
    }
    catch (error) {
        console.error('💥 [BULLETPROOF API] Health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed'
        });
    }
});
export default router;
