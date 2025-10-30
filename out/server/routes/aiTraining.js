import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
// Note: pdf-parse dynamically imported to avoid module load issues
import { db } from '../db';
// import { /* aiTrainingDocuments */ } from '../../shared/schema'; // Temporarily disabled during schema migration
import { v4 as uuid } from 'uuid';
const router = express.Router();
// Configure multer for AI training document uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(process.cwd(), 'uploads', 'ai-training');
            fs.mkdir(uploadPath, { recursive: true }).then(() => cb(null, uploadPath));
        },
        filename: (req, file, cb) => {
            const uniqueId = uuid();
            const extension = path.extname(file.originalname);
            cb(null, `${uniqueId}${extension}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'text/plain', 'application/json', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF, TXT, JSON, DOC, DOCX files are allowed.'));
        }
    }
});
/**
 * Extract text from different file types
 */
async function extractTextFromFile(buffer, mimeType) {
    try {
        switch (mimeType) {
            case 'application/pdf':
                const { default: pdfParse } = await import('pdf-parse');
                const pdfData = await pdfParse(buffer);
                return pdfData.text;
            case 'text/plain':
            case 'application/json':
                return buffer.toString('utf-8');
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                // For now, return buffer as text - can add mammoth.js for proper DOC/DOCX parsing
                return buffer.toString('utf-8');
            default:
                throw new Error(`Unsupported file type: ${mimeType}`);
        }
    }
    catch (error) {
        console.error('❌ [AI Training] Text extraction failed:', error);
        throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Save document to filesystem
 */
async function saveDocumentToDisk(documentId, buffer, originalName) {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'ai-training');
    await fs.mkdir(uploadsDir, { recursive: true });
    const fileExtension = path.extname(originalName);
    const fileName = `${documentId}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, buffer);
    console.log(`💾 [AI Training] Document saved: ${fileName}`);
    return `uploads/ai-training/${fileName}`;
}
/**
 * POST /api/ai-training/upload
 * Upload and process training documents
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('📚 [AI Training] Processing document upload...');
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided'
            });
        }
        const { originalname, buffer, mimetype, size } = req.file;
        const { title, description, category } = req.body;
        // Generate document ID
        const documentId = uuid();
        // Extract text content
        console.log(`📄 [AI Training] Extracting text from ${originalname} (${mimetype})`);
        const extractedText = await extractTextFromFile(buffer, mimetype);
        // Save file to disk
        const filePath = await saveDocumentToDisk(documentId, buffer, originalname);
        // Save to database
        await db.insert( /* aiTrainingDocuments */).values({
            id: documentId,
            title: title || originalname,
            description: description || null,
            category: category || 'general',
            fileName: originalname,
            filePath: filePath,
            fileSize: size,
            mimeType: mimetype,
            extractedText: extractedText,
            status: 'extracted',
            uploadedBy: 'staff', // In production, get from auth
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`✅ [AI Training] Document processed successfully: ${documentId}`);
        console.log(`   - Title: ${title || originalname}`);
        console.log(`   - Text length: ${extractedText.length} characters`);
        console.log(`   - Status: extracted`);
        res.json({
            success: true,
            documentId,
            title: title || originalname,
            fileName: originalname,
            fileSize: size,
            textLength: extractedText.length,
            status: 'extracted',
            message: 'Document uploaded and text extracted successfully'
        });
    }
    catch (error) {
        console.error('❌ [AI Training] Upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Upload failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * GET /api/ai-training/documents
 * Retrieve all training documents
 */
router.get('/documents', async (req, res) => {
    try {
        console.log('📚 [AI Training] Fetching training documents...');
        const rawDocuments = await db.select().from( /* aiTrainingDocuments */);
        const documents = rawDocuments.map(doc => ({
            id: doc.id,
            title: doc.title,
            description: doc.description,
            category: doc.category,
            fileName: doc.name,
            fileSize: doc.size,
            mimeType: doc.mime_type,
            status: doc.status,
            uploadedBy: doc.uploaded_by,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            textLength: doc.extracted_text ? doc.extracted_text.length : 0
        }));
        console.log(`📊 [AI Training] Retrieved ${documents.length} training documents`);
        res.json({
            success: true,
            documents,
            total: documents.length
        });
    }
    catch (error) {
        console.error('❌ [AI Training] Fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch documents',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * GET /api/ai-training/document/:id
 * Get specific training document with full text
 */
router.get('/document/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📄 [AI Training] Fetching document: ${id}`);
        // TODO: Implement proper document fetching when schema is available
        const document = null;
        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }
        res.json({
            success: true,
            document
        });
    }
    catch (error) {
        console.error('❌ [AI Training] Document fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch document',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * DELETE /api/ai-training/document/:id
 * Delete training document
 */
router.delete('/document/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ [AI Training] Deleting document: ${id}`);
        // Get document info first (temporarily disabled - no table)
        const document = [];
        if (document.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }
        // Delete from database (temporarily disabled - no table)
        // await db.delete(aiTrainingDocuments).where(eq(aiTrainingDocuments.id, id));
        // Delete file from disk
        try {
            const fullPath = path.join(process.cwd(), document[0].filePath);
            await fs.unlink(fullPath);
            console.log(`🗑️ [AI Training] File deleted: ${document[0].fileName}`);
        }
        catch (fileError) {
            console.warn(`⚠️ [AI Training] Could not delete file: ${fileError.message}`);
        }
        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    }
    catch (error) {
        console.error('❌ [AI Training] Delete error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete document',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * GET /api/ai-training/stats
 * Get training documents statistics
 */
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 [AI Training] Generating statistics...');
        const documents = await db.select()
            .from( /* aiTrainingDocuments */);
        const stats = {
            totalDocuments: documents.length,
            totalTextCharacters: documents.reduce((sum, doc) => sum + (doc.extractedText?.length || 0), 0),
            statusBreakdown: {
                extracted: documents.filter(d => d.status === 'extracted').length,
                processing: documents.filter(d => d.status === 'processing').length,
                indexed: documents.filter(d => d.status === 'indexed').length,
                failed: documents.filter(d => d.status === 'failed').length
            },
            categoryBreakdown: documents.reduce((acc, doc) => {
                acc[doc.category] = (acc[doc.category] || 0) + 1;
                return acc;
            }, {}),
            fileTypeBreakdown: documents.reduce((acc, doc) => {
                acc[doc.mimeType] = (acc[doc.mimeType] || 0) + 1;
                return acc;
            }, {})
        };
        console.log(`📊 [AI Training] Stats generated: ${stats.totalDocuments} documents, ${stats.totalTextCharacters} characters`);
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        console.error('❌ [AI Training] Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate statistics',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export { router as aiTrainingRouter };
