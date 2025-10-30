import { Router } from 'express';
import multer from 'multer';
import { reuploadDocumentWithVersioning } from '../utils/documentVersioning';
import { validate as isUUID } from 'uuid';
const router = Router();
// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common document types
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: PDF, JPG, PNG, DOC, DOCX, TXT`));
        }
    }
});
/**
 * POST /api/document-reupload/:id/reupload
 * Re-upload a document with SHA256 versioning
 */
router.post('/:id/reupload', upload.single('document'), async (req, res) => {
    console.log(`📤 [REUPLOAD] POST /api/documents/${req.params.id}/reupload - Re-upload request`);
    try {
        const { id } = req.params;
        const file = req.file;
        // Validate document ID
        if (!id || !isUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid document ID format'
            });
        }
        // Validate file upload
        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided'
            });
        }
        // Validate file size (minimum 1KB)
        if (file.size < 1024) {
            return res.status(400).json({
                success: false,
                error: 'File too small (minimum 1KB required)'
            });
        }
        console.log(`📁 [REUPLOAD] Processing file: ${file.originalname} (${file.size} bytes)`);
        console.log(`🔍 [REUPLOAD] MIME type: ${file.mimetype}`);
        // Re-upload with versioning
        const result = await reuploadDocumentWithVersioning(id, file);
        console.log(`✅ [REUPLOAD] Document re-uploaded successfully`);
        res.json({
            success: true,
            message: 'Document re-uploaded successfully',
            documentId: id,
            fileName: file.originalname,
            fileSize: file.size,
            newStorageKey: result.newStorageKey,
            hash: result.hash.substring(0, 12), // Return truncated hash for UI
            uploadedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error(`❌ [REUPLOAD] Error re-uploading document:`, error);
        // Handle specific error types
        if (error instanceof Error ? error.message : String(error).includes('Document not found')) {
            return res.status(404).json({
                success: false,
                error: 'Document not found',
                message: error instanceof Error ? error.message : String(error)
            });
        }
        if (error instanceof Error ? error.message : String(error).includes('S3 upload failed')) {
            return res.status(500).json({
                success: false,
                error: 'Upload failed',
                message: 'Failed to upload to cloud storage'
            });
        }
        // Generic error response
        res.status(500).json({
            success: false,
            error: 'Re-upload failed',
            message: error instanceof Error ? error.message : String(error) || 'Unknown error during re-upload'
        });
    }
});
/**
 * GET /api/document-reupload/:id/versions
 * Get version history for a document
 */
router.get('/:id/versions', async (req, res) => {
    console.log(`📚 [VERSIONS] GET /api/documents/${req.params.id}/versions - Version history request`);
    try {
        const { id } = req.params;
        if (!id || !isUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid document ID format'
            });
        }
        // TODO: Implement version history when document_versions table exists
        res.json({
            success: true,
            documentId: id,
            versions: [],
            message: 'Version history feature coming soon'
        });
    }
    catch (error) {
        console.error(`❌ [VERSIONS] Error getting document versions:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to get versions',
            message: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Error handling middleware for multer
 */
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large',
                message: 'Maximum file size is 10MB'
            });
        }
    }
    if (error instanceof Error ? error.message : String(error).includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            error: 'Invalid file type',
            message: error instanceof Error ? error.message : String(error)
        });
    }
    console.error('❌ [REUPLOAD] Multer error:', error);
    res.status(500).json({
        success: false,
        error: 'Upload error',
        message: error instanceof Error ? error.message : String(error)
    });
});
export default router;
