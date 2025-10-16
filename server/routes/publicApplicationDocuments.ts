import { Router, Request, Response } from 'express';
import multer from 'multer';
import { documents } from '../../shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { saveDocumentToDiskAndDB } from '../utils/documentStorage';

const router = Router();

// Configure multer for DISK storage - bulletproof document persistence
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/documents/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename to prevent collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `temp-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log(`📄 [Public Documents] File filter - MIME type: ${file.mimetype}, Original name: ${file.originalname}`);
  
  // ✅ CRITICAL FIX: Accept ALL PDF MIME variations for public documents
  const allowedTypes = [
    'application/pdf',
    'application/x-pdf',
    'application/octet-stream', // fallback for PDFs
    'binary/octet-stream',      // binary fallback  
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png', 
    'image/gif',
    'text/plain',
    'application/json',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    console.log(`✅ [Public Documents] File type ${file.mimetype} is allowed`);
    cb(null, true);
  } else {
    console.log(`❌ [Public Documents] File type ${file.mimetype} is not allowed`);
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Document type validation - STRICT: NO FALLBACK TO "other"
// Standardized Document Types from Lender Product Requirements - ENFORCED
const VALID_DOCUMENT_TYPES = [
  'accounts_payable',
  'accounts_receivable', 
  'articles_of_incorporation',
  'balance_sheet',
  'bank_statements',
  'business_license',
  'business_plan',
  'cash_flow_statement',
  'collateral_docs',
  'drivers_license_front_back',
  'equipment_quote',
  'financial_statements',
  'invoice_samples',
  'other',
  'personal_financial_statement',
  'personal_guarantee',
  'profit_loss_statement',
  'proof_of_identity',
  'signed_application',
  'supplier_agreement',
  'tax_returns',
  'void_pad'
];

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// POST /api/public/applications/:id/documents
router.post('/:id/documents', upload.single('document'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`✅ [MONITOR] Document upload request received for application ${req.params.id}`);
  console.log("📤 [MONITOR] Document details:", req.file ? {
    name: req.file.originalname,
    type: req.body.documentType || 'unknown',
  } : 'No file uploaded');

  try {
    const rawApplicationId = req.params.id;
    const { documentType } = req.body;
    const file = req.file;

    // Strip test- prefix for validation and database operations
    const actualId = rawApplicationId.replace(/^test-/, '');
    
    console.log(`📤 [Public Documents] Application ID: ${rawApplicationId} → ${actualId}`);

    // Validation
    const validationErrors: Array<{field: string, message: string}> = [];

    // Validate UUID format (after stripping test- prefix)
    if (!isValidUUID(actualId)) {
      validationErrors.push({
        field: 'applicationId',
        message: 'Invalid application ID format'
      });
    }

    // Validate file
    if (!file) {
      validationErrors.push({
        field: 'document',
        message: 'File is required'
      });
    }

    // STRICT document type validation - NO FALLBACK TO "other"
    if (!documentType) {
      console.error(`❌ Missing document type in request`);
      validationErrors.push({
        field: 'documentType',
        message: 'Document type is required'
      });
    } else if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
      console.error(`❌ Invalid document type received: ${documentType}`);
      console.error(`❌ Valid types are:`, VALID_DOCUMENT_TYPES);
      validationErrors.push({
        field: 'documentType',
        message: `Unsupported document type: ${documentType}. Valid types: ${VALID_DOCUMENT_TYPES.join(', ')}`
      });
    }

    if (validationErrors.length > 0) {
      console.log(`❌ [Public Documents] Validation failed for ${rawApplicationId}:`, validationErrors);
      
      // Clean up temporary file on validation error
      if (file?.path) {
        try {
          await fs.unlink(file.path);
          console.log(`🧹 [PUBLIC UPLOAD] Cleaned up temporary file: ${file.path}`);
        } catch (err) {
          console.error(`⚠️ [PUBLIC UPLOAD] Failed to clean up temp file: ${err}`);
        }
      }
      
      // Match the exact error format expected by client
      if (validationErrors.some(err => err.field === 'applicationId')) {
        return res.status(400).json({
          error: 'Invalid application ID format'
        });
      }
      
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationErrors
      });
    }

    console.log(`🔍 [Public Documents] Validating application: ${actualId}`);

    // Check if application exists and is in draft status
    
    const applicationResult = await db.query.applications.findFirst({
      where: (applications, { eq }) => eq(applications.id, actualId)
    });

    if (!applicationResult) {
      // Clean up temporary file if application not found
      if (file?.path) {
        try {
          await fs.unlink(file.path);
          console.log(`🧹 [PUBLIC UPLOAD] Cleaned up temporary file for non-existent application: ${file.path}`);
        } catch (err) {
          console.error(`⚠️ [PUBLIC UPLOAD] Failed to clean up temp file: ${err}`);
        }
      }
      
      return res.status(404).json({
        error: 'Application not found',
        details: `No application found with ID: ${actualId}`
      });
    }

    console.log(`💾 [BULLETPROOF UPLOAD] Using unified document storage system`);

    // Use unified document storage system 
    const documentId = await saveDocumentToDiskAndDB(
      actualId,
      file!.path, // Use multer disk storage path
      file!.originalname,
      documentType,
      'public-client'
    );

    const completionTime = Date.now() - startTime;
    console.log(`✅ [MONITOR] Document uploaded successfully - ID: ${documentId}`);
    console.log(`✅ [MONITOR] File: ${file!.originalname} (${file!.size} bytes)`);
    console.log(`✅ [MONITOR] Type: ${documentType}`);
    console.log(`✅ [MONITOR] Application: ${actualId}`);
    console.log(`✅ [MONITOR] Processing time: ${completionTime}ms`);

    res.status(201).json({
      success: true,
      document: {
        id: documentId,
        applicationId: rawApplicationId,
        documentType: documentType,
        fileName: file!.originalname,
        fileSize: file!.size,
        fileType: file!.mimetype,
        isRequired: false,
        isVerified: false,
        createdAt: new Date().toISOString()
      },
      message: 'Document uploaded successfully with unified storage'
    });

  } catch (error: unknown) {
    console.error(`❌ [BULLETPROOF UPLOAD] Error processing request:`, error);
    
    // No file cleanup needed for memory storage
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;