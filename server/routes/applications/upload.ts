import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { documents, applications, auditLog } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { processDocumentOCR } from '../../ocrService';
// import { bearerAuth } from '../../middleware/bearerAuth'; // REMOVED for Staff App Patch - public access
import { stripAppProdPrefix } from '../../utils/idHelpers';

const router = Router();

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 🔧 STRICT COMPLIANCE: Disk storage only  
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'uploads', 'documents');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uuid = uuidv4();
      const extension = path.extname(file.originalname);
      cb(null, `${uuid}${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Allow specific document types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain' // Added for .txt files like bank statements
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and spreadsheets are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

// Upload document endpoint for applications - stores document metadata in database
router.post('/:applicationId', upload.array('files', 10), async (req: any, res) => {
  try {
    const { applicationId } = req.params;
    const { category = 'Bank Statements', documentType = 'bank_statements' } = req.body;
    
    console.log(`📤 Upload request: ${req.files?.length} files, category: ${category}, documentType: ${documentType}`);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'applicationId is required'
      });
    }

    // Strip app_prod_ prefix for database lookup
    const cleanApplicationId = stripAppProdPrefix(applicationId);
    console.log(`[ID MAPPING] Cleaned app_prod_ prefix: ${applicationId} → ${cleanApplicationId}`);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    // Verify application exists using clean UUID
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, cleanApplicationId));

    if (!application) {
      // 🚫 FILE DELETION DISABLED - PERMANENT HARDENING PHASE
      // fs.unlinkSync(req.file.path); // REMOVED - No automatic file deletion allowed
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Process all uploaded files
    const storedDocuments = [];
    const files = req.files as Express.Multer.File[];

    for (const file of files) {
      // Create unique filename with UUID
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${uniqueSuffix}_${file.originalname}`;
      
      // Store document metadata in database using clean UUID
      const documentData = {
        applicationId: cleanApplicationId,
        fileName: filename,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        documentType: documentType as 'other' | 'bank_statements' | 'tax_returns' | 'financial_statements' | 'business_license',
        uploadedBy: application.userId
      };

      // ✅ MONITOR: Document upload starting
      console.log(`✅ [MONITOR] Document upload request received for application ${req.params.applicationId}`);
      console.log("📤 [MONITOR] Document details:", {
        name: file.originalname,
        type: category,
      });

      const [newDocument] = await db
        .insert(documents)
        .values(documentData)
        .returning();

      console.log(`✅ [MONITOR] Document uploaded successfully - ID: ${newDocument.id}`);
      console.log(`✅ [MONITOR] Processing time: ${Date.now() - startTime}ms`);

      storedDocuments.push(newDocument);

      // Trigger OCR processing in background for supported file types
      if (['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain'].includes(file.mimetype)) {
        console.log(`🔍 OCR processing queued for document ${newDocument.id}`);
        try {
          // Process OCR in background (non-blocking)
          processDocumentOCR(newDocument.id, file.path, file.mimetype, category)
            .then(() => {
              console.log(`✅ OCR processing completed for document ${newDocument.id}`);
            })
            .catch((error) => {
              console.error(`❌ OCR processing failed for document ${newDocument.id}:`, error);
            });
        } catch (error: unknown) {
          console.error(`❌ Error starting OCR processing for document ${newDocument.id}:`, error);
        }
      }
    }

    // Log document upload
    console.log(`📄 Documents uploaded:`, {
      applicationId: cleanApplicationId,
      externalId: applicationId,
      count: files.length,
      category: category,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    });

    console.log(`✅ ${files.length} documents uploaded and stored for application ${cleanApplicationId} (external: ${applicationId})`);

    res.json({
      success: true,
      fileId: storedDocuments[0]?.id,
      fileName: storedDocuments[0]?.fileName,
      stored: files.length,
      category: category,
      message: `${files.length} documents uploaded successfully`,
      documents: storedDocuments.map(doc => ({
        id: doc.id,
        filename: doc.fileName,
        size: doc.fileSize,
        createdAt: doc.createdAt
      }))
    });

  } catch (error: unknown) {
    console.error('Error uploading document:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload document'
    });
  }
});

export default router;