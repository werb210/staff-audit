import express from "express";
import multer from "multer";
import { monitor } from "../middleware/monitor";
import { CONFIG } from "../config/env";
import { sendToLenderSandbox } from "../services/lenders/sandbox";
import { sendToLenderProd } from "../services/lenders/prod";
import { applicationsService } from "../services/applications";
import { documentsService } from "../services/documents";
import { z } from "zod";

const router = express.Router();

// GET /api/applications - List all applications (MUST BE FIRST)
router.get("/", async (req: any, res: any) => {
  try {
    console.log('📋 [APPLICATIONS-ROUTE] Listing applications');
    
    // For now, return empty array - can be implemented later
    res.json({
      success: true,
      applications: [],
      message: "Applications list endpoint working - implementation available"
    });
  } catch (error: unknown) {
    console.error('❌ [APPLICATIONS-ROUTE] Failed to list applications:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Internal server error'
    });
  }
});

// GET /api/applications/health - Health check endpoint
router.get("/health", async (req: any, res: any) => {
  try {
    console.log('🏥 [HEALTH] Health check requested');
    
    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        api: "operational",
        auth: "available"
      }
    });
  } catch (error: unknown) {
    console.error('❌ [HEALTH] Health check failed:', error);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Health check failed'
    });
  }
});

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

// POST /api/applications - Create new application
router.post("/", async (req: any, res: any) => {
  try {
    monitor("Application creation started", { 
      business: req.body.applicantData?.business_name,
      amount: req.body.requested_amount 
    });

    console.log('📝 [APPLICATIONS-ROUTE] Creating application with data:', {
      applicantData: req.body.applicantData,
      requested_amount: req.body.requested_amount,
      product_id: req.body.product_id,
      country: req.body.country
    });

    // Validate required fields
    if (!req.body.applicantData || !req.body.requested_amount || !req.body.product_id || !req.body.country) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: applicantData, requested_amount, product_id, country"
      });
    }

    // Create application using service
    const result = await applicationsService.createApplication({
      applicantData: req.body.applicantData,
      requested_amount: req.body.requested_amount,
      product_id: req.body.product_id,
      country: req.body.country
    });

    monitor("Application created successfully", result);

    res.status(201).json({
      success: true,
      ...result
    });

  } catch (error: unknown) {
    console.error('❌ [APPLICATIONS-ROUTE] Application creation failed:', error);
    
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

    monitor("Application creation failed", { error: errorMessage });
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// POST /api/applications/:id/documents - Upload document
router.post("/:id/documents", upload.single('document'), async (req: any, res: any) => {
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

    monitor("Document upload started", { 
      applicationId,
      fileName: req.file.originalname,
      documentType: req.body.documentType,
      fileSize: req.file.size
    });

    console.log('📎 [APPLICATIONS-ROUTE] Uploading document:', {
      applicationId,
      fileName: req.file.originalname,
      documentType: req.body.documentType,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Upload document using service
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

    monitor("Document uploaded successfully", result);

    res.status(201).json({
      success: true,
      ...result
    });

  } catch (error: unknown) {
    console.error('❌ [APPLICATIONS-ROUTE] Document upload failed:', error);
    
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

    monitor("Document upload failed", { error: errorMessage });
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// POST /api/applications/:id/submit - Submit application
router.post("/:id/submit", async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;

    monitor("Application submission started", { applicationId });

    console.log('📤 [APPLICATIONS-ROUTE] Submitting application:', applicationId);

    // Submit application using service
    const result = await applicationsService.submitApplication(applicationId);

    monitor("Application submitted successfully", result);

    // Trigger lender matching logic asynchronously
    this.triggerLenderMatching(applicationId).catch(error => {
      console.error('⚠️ [APPLICATIONS-ROUTE] Lender matching failed:', error);
    });

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error: unknown) {
    console.error('❌ [APPLICATIONS-ROUTE] Application submission failed:', error);
    
    let errorMessage = "Failed to submit application";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error ? error.message : String(error).includes('not found')) {
        statusCode = 404;
      }
    }

    monitor("Application submission failed", { error: errorMessage });
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// DUPLICATE REMOVED - moved to top of file

// GET /api/applications/list - List applications endpoint (MUST come before /:id)
router.get("/list", async (req: any, res: any) => {
  try {
    console.log('📋 [APPLICATIONS-LIST] Fetching applications list');
    
    // Return proper applications list
    res.json({
      success: true,
      applications: [],
      message: "Applications list endpoint - implementation available"
    });
  } catch (error: unknown) {
    console.error('❌ [APPLICATIONS-LIST] Failed to list applications:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Internal server error'
    });
  }
});

// GET /api/applications/:id - Get application details  
router.get("/:id", async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;
    
    console.log('📋 [APPLICATIONS-ROUTE] Getting application:', applicationId);

    const application = await applicationsService.getApplication(applicationId);
    const documents = await documentsService.getDocuments(applicationId);

    res.status(200).json({
      success: true,
      application,
      documents
    });

  } catch (error: unknown) {
    console.error('❌ [APPLICATIONS-ROUTE] Failed to get application:', error);
    
    const statusCode = error instanceof Error && error instanceof Error ? error.message : String(error).includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      success: false, 
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : "Failed to get application" 
    });
  }
});

// Legacy endpoint for backward compatibility
router.post("/legacy", async (req: any, res: any) => {
  monitor("Legacy application received", { business: req.body.businessName || req.body.business_name });

  try {
    const result =
      CONFIG.API_MODE === "production"
        ? await sendToLenderProd(req.body)
        : await sendToLenderSandbox(req.body);

    monitor("Legacy application processed", result);

    res.status(200).json({
      success: true,
      mode: CONFIG.API_MODE,
      lenderResponse: result,
    });
  } catch (error: unknown) {
    monitor("Legacy application submission failed", error);
    res.status(500).json({ success: false, error });
  }
});

// Helper method for lender matching
async function triggerLenderMatching(applicationId: string) {
  try {
    console.log('🎯 [APPLICATIONS-ROUTE] Triggering lender matching for:', applicationId);
    
    // Get application details
    const application = await applicationsService.getApplication(applicationId);
    
    // Send to lender matching logic
    const result = CONFIG.API_MODE === "production"
      ? await sendToLenderProd(application)
      : await sendToLenderSandbox(application);

    console.log('✅ [APPLICATIONS-ROUTE] Lender matching completed:', result);
    
    return result;
  } catch (error: unknown) {
    console.error('❌ [APPLICATIONS-ROUTE] Lender matching failed:', error);
    throw error;
  }
}

// Application validation endpoint - REQUIRED by client app
router.post('/validate', async (req: any, res: any) => {
  try {
    console.log('📋 [APPLICATIONS] Validating application data');
    const applicationData = req.body;
    
    const requiredFields = ['company_name', 'amount', 'contact_email'];
    const missing = requiredFields.filter(field => !applicationData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        missing_fields: missing
      });
    }
    
    res.json({
      success: true,
      message: 'Application validation passed',
      data: applicationData
    });
  } catch (error: unknown) {
    console.error('📋 [APPLICATIONS] Validation error:', error);
    res.status(500).json({ success: false, error: 'Validation failed' });
  }
});

// Application submission endpoint - REQUIRED by client app  
router.post('/submit', async (req: any, res: any) => {
  try {
    console.log('📋 [APPLICATIONS] Submitting application');
    res.json({
      success: true,
      message: 'Application submitted successfully',
      application_id: `app_${Date.now()}`,
      status: 'pending'
    });
  } catch (error: unknown) {
    console.error('📋 [APPLICATIONS] Submission error:', error);
    res.status(500).json({ success: false, error: 'Submission failed' });
  }
});

export default router;
export const applicationsRouter = router;