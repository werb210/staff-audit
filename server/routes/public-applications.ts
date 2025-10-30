import express from "express";
import multer from "multer";
import { applicationsService } from "../services/applications";
import { documentsService } from "../services/documents";
import { z } from "zod";

const router = express.Router();

// Configure multer for file uploads
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
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, PNG, TIFF, DOC, and DOCX files are allowed.'));
    }
  }
});

// POST /public/applications - Create new application (for client integration)
router.post("/applications", express.json(), async (req: any, res: any) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 [PUBLIC-APPLICATIONS] Raw request body:', req.body);
      console.log('📝 [PUBLIC-APPLICATIONS] Headers:', req.headers);
      console.log('📝 [PUBLIC-APPLICATIONS] Content-Type:', req.get('Content-Type'));
    }

    // Ensure we have a body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing request body"
      });
    }

    // Validate required fields - client sends different format than staff app
    const { 
      firstName, 
      lastName, 
      email, 
      phone,
      businessName,
      businessType, 
      amountRequested, 
      productType,
      purpose
    } = req.body;

    if (!businessName || !email || !amountRequested) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: businessName, email, amountRequested"
      });
    }

    // Transform client data to staff service format
    const applicantData = {
      business_name: businessName,
      business_type: businessType || 'llc',
      contact_email: email,
      contact_first_name: firstName,
      contact_last_name: lastName,
      business_phone: phone
    };

    // Create application using existing service
    const result = await applicationsService.createApplication({
      applicantData,
      requested_amount: Number(amountRequested),
      product_id: "550e8400-e29b-41d4-a716-446655440000", // Default product ID
      country: "CA" // Default to CA
    });

    console.log('✅ [PUBLIC-APPLICATIONS] Application created successfully:', result.id);

    res.status(201).json({
      success: true,
      id: result.id,
      status: result.status
    });

  } catch (error: unknown) {
    console.error('❌ [PUBLIC-APPLICATIONS] Application creation failed:', error);
    
    let errorMessage = "Failed to create application";
    let statusCode = 500;

    if (error instanceof z.ZodError) {
      errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      statusCode = 400;
    } else if (error instanceof Error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error ? error.message : String(error).includes('not found') || error instanceof Error ? error.message : String(error).includes('invalid')) {
        statusCode = 400;
      }
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// POST /public/applications/:id/documents - Upload document (for client integration)
router.post("/applications/:id/documents", upload.single('document'), async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file provided"
      });
    }

    if (!req.body.documentType) {
      return res.status(400).json({
        success: false,
        error: "documentType is required"
      });
    }

    console.log('📎 [PUBLIC-APPLICATIONS] Uploading document:', {
      applicationId,
      fileName: req.file.originalname,
      documentType: req.body.documentType,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Upload document using existing service
    const result = await documentsService.uploadDocument(
      applicationId,
      req.file.buffer,
      {
        fileName: req.file.originalname,
        documentType: req.body.documentType,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    );

    console.log('✅ [PUBLIC-APPLICATIONS] Document uploaded successfully:', result.document_id);

    res.status(201).json({
      success: true,
      document_id: result.document_id,
      s3_url: result.s3_url,
      ocr_status: result.ocr_status
    });

  } catch (error: unknown) {
    console.error('❌ [PUBLIC-APPLICATIONS] Document upload failed:', error);
    
    let errorMessage = "Failed to upload document";
    let statusCode = 500;

    if (error instanceof z.ZodError) {
      errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      statusCode = 400;
    } else if (error instanceof Error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error ? error.message : String(error).includes('not found') || error instanceof Error ? error.message : String(error).includes('invalid')) {
        statusCode = 400;
      }
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// GET /public/applications/:id/documents - List documents for application (for client integration)
router.get("/applications/:id/documents", async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;

    console.log('📋 [PUBLIC-APPLICATIONS] Listing documents for application:', applicationId);

    // Get documents using existing service
    const documents = await documentsService.getDocuments(applicationId);

    console.log(`✅ [PUBLIC-APPLICATIONS] Found ${documents.length} documents for application:`, applicationId);

    res.status(200).json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        document_type: doc.document_type,
        name: doc.name,
        size: doc.size,
        upload_date: doc.upload_date,
        status: doc.status,
        s3_url: doc.s3_url,
        ocr_status: doc.ocr_status,
        confidence_score: doc.confidence_score
      }))
    });

  } catch (error: unknown) {
    console.error('❌ [PUBLIC-APPLICATIONS] Failed to list documents:', error);
    
    let errorMessage = "Failed to retrieve documents";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error ? error.message : String(error).includes('not found')) {
        statusCode = 404;
      }
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// GET /public/applications/:id/status - Get application status (for client integration)  
router.get("/applications/:id/status", async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;

    console.log('🔍 [PUBLIC-APPLICATIONS] Getting status for application:', applicationId);

    // Get application status using existing service
    const application = await applicationsService.getApplication(applicationId);

    console.log('✅ [PUBLIC-APPLICATIONS] Retrieved application status:', application.status);

    res.status(200).json({
      success: true,
      id: application.id,
      status: application.status,
      stage: application.stage,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      business_name: application.business,
      amount_requested: application.amount,
      progress: {
        application_created: true,
        documents_uploaded: application.status !== 'draft',
        submitted: ['submitted', 'In Review', 'approved', 'rejected'].includes(application.status),
        under_review: application.status === 'In Review',
        decision_made: ['approved', 'rejected'].includes(application.status)
      }
    });

  } catch (error: unknown) {
    console.error('❌ [PUBLIC-APPLICATIONS] Failed to get application status:', error);
    
    let errorMessage = "Failed to retrieve application status";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error ? error.message : String(error).includes('not found')) {
        statusCode = 404;
      }
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// POST /public/applications/:id/submit - Submit application (for client integration)
router.post("/applications/:id/submit", async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;

    console.log('📤 [PUBLIC-APPLICATIONS] Submitting application:', applicationId);

    // Submit application using existing service
    const result = await applicationsService.submitApplication(applicationId);

    console.log('✅ [PUBLIC-APPLICATIONS] Application submitted successfully:', result);

    res.status(200).json({
      success: true,
      id: result.id,
      status: "submitted"
    });

  } catch (error: unknown) {
    console.error('❌ [PUBLIC-APPLICATIONS] Application submission failed:', error);
    
    let errorMessage = "Failed to submit application";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error ? error.message : String(error).includes('not found')) {
        statusCode = 404;
      }
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

export default router;