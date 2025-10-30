/**
 * File Upload Routes
 * Handles document uploads with multer and database integration
 */
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { db } from "../db";
import { documents, applications } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { processDocumentOCR } from "../ocrService";
import { stripAppProdPrefix } from "../utils/idHelpers";
import { validateDocumentType, normalizeDocumentType } from "../middleware/documentTypeValidation";
const router = Router();
// Helper function to determine if document should be processed with OCR
function shouldProcessOCR(filename, category) {
    const ocrCategories = [
        'bank_statements',
        'tax_returns',
        'financial_statements',
        'business_license',
        'articles_of_incorporation',
        'invoice_samples',
        'accounts_receivable_aging'
    ];
    const fileExtension = filename.toLowerCase().split('.').pop();
    const supportedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'txt'];
    return ocrCategories.includes(category) && supportedExtensions.includes(fileExtension);
}
// Configure multer for file storage
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const applicationId = req.params.applicationId;
        // Validate applicationId to prevent path traversal
        if (!applicationId || typeof applicationId !== 'string') {
            return cb(new Error('Invalid application ID'), '');
        }
        // Check for path traversal patterns and ensure valid format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const numericRegex = /^\d+$/;
        const safeId = applicationId.replace(/[^a-zA-Z0-9-_]/g, '');
        if (applicationId !== safeId || (!uuidRegex.test(applicationId) && !numericRegex.test(applicationId))) {
            return cb(new Error('Invalid application ID format'), '');
        }
        const uploadDir = path.join(process.cwd(), 'uploads', applicationId);
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        }
        catch (error) {
            cb(error, '');
        }
    },
    filename: (req, file, cb) => {
        // Enhanced security: sanitize filename to prevent path traversal
        const uniqueId = crypto.randomUUID();
        const ext = path.extname(file.originalname).toLowerCase();
        const name = path.basename(file.originalname, ext);
        // Sanitize filename - remove dangerous characters
        const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
        // Additional path traversal protection
        if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
            return cb(new Error('Invalid filename - path traversal detected'), '');
        }
        cb(null, `${uniqueId}_${sanitizedName}${ext}`);
    }
});
// File filter for allowed document types
const fileFilter = (req, file, cb) => {
    // ✅ CRITICAL FIX: Accept ALL PDF MIME variations
    const allowedMimes = [
        'application/pdf',
        'application/x-pdf',
        'application/octet-stream', // fallback for PDFs
        'binary/octet-stream', // binary fallback
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/plain',
        'application/json', // For testing
    ];
    console.log(`🔍 [UPLOAD MIME DEBUG] File: ${file.originalname}, MIME: ${file.mimetype}, Size: ${file.size || 'unknown'} bytes`);
    // Allow by file extension as fallback
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.csv', '.txt', '.json', '.xls', '.xlsx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} with extension ${fileExtension} not allowed`));
    }
};
// Configure multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files per request
    }
});
/**
 * POST /api/upload/:applicationId
 * Upload files for an application (supports both 'files' array and 'document' single field)
 */
router.post("/:applicationId", normalizeDocumentType, validateDocumentType, upload.any(), async (req, res) => {
    try {
        const { applicationId } = req.params;
        const files = req.files;
        const { category = "other", documentType = "other" } = req.body;
        // Strip app_prod_ prefix for database lookup
        const cleanApplicationId = stripAppProdPrefix(applicationId);
        console.log(`[ID MAPPING] Cleaned app_prod_ prefix: ${applicationId} → ${cleanApplicationId}`);
        // S-6: Log upload size & MIME to detect mobile browser issues
        console.log(`📤 Upload request: ${files?.length} files, category: ${category}, documentType: ${documentType}`);
        if (files && files.length > 0) {
            files.forEach((file, index) => {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                console.log(`📄 File ${index + 1}: ${file.originalname}`);
                console.log(`   📊 Size: ${fileSizeMB}MB (${file.size} bytes)`);
                console.log(`   🏷️  MIME: ${file.mimetype}`);
                console.log(`   📁 Path: ${file.path}`);
                // S-6: Warn about potential mobile browser issues
                if (file.size > 5 * 1024 * 1024) { // 5MB
                    console.log(`   ⚠️  Large file detected - may cause mobile upload issues`);
                }
                if (!file.mimetype || file.mimetype === 'application/octet-stream') {
                    console.log(`   ⚠️  Generic MIME type - may indicate mobile browser compatibility issue`);
                }
            });
        }
        // Validate application exists using clean UUID
        const [application] = await db
            .select()
            .from(applications)
            .where(eq(applications.id, cleanApplicationId));
        if (!application) {
            return res.status(404).json({
                success: false,
                error: "Application not found"
            });
        }
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No files provided"
            });
        }
        // Process each uploaded file
        const uploadedDocuments = [];
        for (const file of files) {
            console.log(`🔍 About to insert document with type: "${documentType}"`);
            // Insert document record
            const [document] = await db
                .insert(documents)
                .values({
                applicationId: cleanApplicationId,
                fileName: file.filename,
                fileSize: file.size,
                documentType: documentType, // Use the actual document type from request
                filePath: file.path,
                uploadedBy: "00000000-0000-0000-0000-000000000001" // Default user for now
            })
                .returning();
            console.log(`✅ Document inserted with ID: ${document.id}, documentType: ${document.documentType}`);
            // Skip application-document relationship for now since table may not exist
            // await db.insert(applicationDocuments).values({
            //   applicationId: cleanApplicationId,
            //   documentId: document.id,
            //   category: category,
            //   isRequired: false,
            //   uploadOrder: uploadedDocuments.length
            // });
            uploadedDocuments.push({
                id: document.id,
                fileName: document.fileName,
                filePath: document.filePath,
                fileSize: document.fileSize,
                status: "PENDING",
                category: category
            });
            // Trigger OCR processing asynchronously for financial documents
            console.log(`📋 File: ${file.filename}, Category: ${category}, ShouldOCR: ${shouldProcessOCR(file.filename, category)}`);
            if (document.filePath && shouldProcessOCR(file.filename, category)) {
                console.log(`🔍 Triggering OCR processing for document ${document.id}`);
                processDocumentOCR(document.id, cleanApplicationId, document.filePath, category)
                    .then((ocrId) => {
                    console.log(`✅ OCR processing completed for document ${document.id}, OCR ID: ${ocrId}`);
                })
                    .catch((error) => {
                    console.error(`❌ OCR processing failed for document ${document.id}:`, error);
                });
            }
            else {
                console.log(`⏭️ Skipping OCR for ${file.filename} (category: ${category})`);
            }
        }
        res.json({
            success: true,
            uploaded: uploadedDocuments,
            message: `Successfully uploaded ${uploadedDocuments.length} files`
        });
    }
    catch (error) {
        console.error("File upload error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to upload files",
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
