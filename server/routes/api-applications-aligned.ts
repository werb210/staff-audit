// Aligned API endpoints for client-staff integration
// Exact endpoints expected by client app:
// POST /api/applications - Create application  
// GET /api/applications/:id - Get application
// POST /api/applications/:id/documents/upload - Upload documents

import { Router, Request, Response } from "express";
import { Client } from "pg";
import crypto from "crypto";
import multer from "multer";
import { S3Storage } from "../utils/s3.js";

const router = Router();

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

async function pgc() {
  const c = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  return c;
}

// POST /api/applications - Create application
router.post("/applications", async (req: Request, res: Response) => {
  const client = await pgc();
  try {
    console.log("📝 [API-ALIGNED] Received application creation request");
    
    const {
      applicant_name,
      email,
      phone,
      business_name,
      requested_amount,
      use_of_funds,
      country = "CA",
      industry = "Other",
      step1,
      step3,
      step4
    } = req.body;

    // Handle both direct format and step-based format from client-api
    let finalData;
    
    if (step1 && step3 && step4) {
      // Step-based format (from existing client-api.ts)
      finalData = {
        email: step4.email,
        phone: step4.phone,
        first_name: step4.firstName,
        last_name: step4.lastName,
        business_name: step3.businessName,
        requested_amount: step1.fundingAmount,
        use_of_funds: step1.fundsPurpose,
        country: step1.country,
        industry: step3.industry || "Other",
        form_data: {
          businessName: step3.businessName,
          businessPhone: step3.businessPhone,
          businessEmail: step3.businessEmail,
          industry: step3.industry,
          country: step1.country,
          currency: step1.currency || "CAD"
        }
      };
    } else {
      // Direct format
      finalData = {
        email: email || "contact@example.com",
        phone: phone || "555-123-4567", 
        first_name: applicant_name?.split(' ')[0] || "Contact",
        last_name: applicant_name?.split(' ').slice(1).join(' ') || "Person",
        business_name: business_name || "Business Name",
        requested_amount: requested_amount || 50000,
        use_of_funds: use_of_funds || "Business expansion",
        country: country,
        industry: industry,
        form_data: {
          applicant_name,
          email,
          phone,
          business_name,
          country,
          industry
        }
      };
    }

    // Create or update user
    const userResult = await client.query(`
      INSERT INTO users (email, phone, first_name, last_name, role, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'client', NULL, now(), now())
      ON CONFLICT (email) DO UPDATE SET 
        phone = EXCLUDED.phone,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = now()
      RETURNING id
    `, [finalData.email, finalData.phone, finalData.first_name, finalData.last_name]);
    
    const userId = userResult.rows[0].id;

    // Create application using existing bf tenant
    const appId = crypto.randomUUID();
    const bfTenantId = '11111111-1111-1111-1111-111111111111'; // Use existing bf tenant
    
    const appResult = await client.query(`
      INSERT INTO applications (
        id, user_id, business_id, tenant_id, requested_amount, use_of_funds, 
        status, form_data, business_name, contact_email, contact_phone,
        submission_country, annual_revenue, years_in_business,
        created_at, updated_at
      )
      VALUES ($1, $2, NULL, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, now(), now())
      RETURNING id, status, created_at
    `, [
      appId, userId, bfTenantId,
      finalData.requested_amount, finalData.use_of_funds,
      JSON.stringify(finalData.form_data),
      finalData.business_name, finalData.email, finalData.phone,
      finalData.country,
      finalData.requested_amount * 2, // Estimate annual revenue
      1 // Default years in business
    ]);

    const application = appResult.rows[0];
    
    console.log(`✅ [API-ALIGNED] Created application ${application.id} for ${finalData.business_name}`);

    res.status(201).json({ 
      success: true,
      application: {
        id: application.id,
        status: application.status,
        created_at: application.created_at
      }
    });

  } catch (error: unknown) {
    console.error("❌ [API-ALIGNED] Application creation error:", error);
    res.status(500).json({ error: "Failed to create application" });
  } finally {
    await client.end();
  }
});

// GET /api/applications/list - List applications (must come BEFORE /:id route)
router.get("/applications/list", async (req: Request, res: Response) => {
  const client = await pgc();
  try {
    console.log("📋 [API-ALIGNED] Fetching applications list");
    
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Fetch applications with pagination
    const result = await client.query(`
      SELECT 
        a.id,
        a.business_name,
        a.requested_amount,
        a.status,
        a.contact_email,
        a.contact_phone,
        a.created_at,
        a.updated_at
      FROM applications a
      ORDER BY a.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query('SELECT COUNT(*) FROM applications');
    const total = parseInt(countResult.rows[0].count);
    
    console.log(`✅ [API-ALIGNED] Found ${result.rows.length} applications`);
    
    res.json({
      success: true,
      applications: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: unknown) {
    console.error("❌ [API-ALIGNED] Error fetching applications:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  } finally {
    await client.end();
  }
});

// GET /api/applications/health - Health check for aligned API
router.get("/applications/health", async (req: Request, res: Response) => {
  try {
    console.log('🏥 [API-ALIGNED-HEALTH] Health check requested');
    
    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "api-applications-aligned"
    });
  } catch (error: unknown) {
    console.error('❌ [API-ALIGNED-HEALTH] Health check failed:', error);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Health check failed'
    });
  }
});

// GET /api/applications/:id - Get application
router.get("/applications/:id", async (req: Request, res: Response) => {
  const client = await pgc();
  try {
    const { id } = req.params;
    
    // Validate UUID format to prevent UUID syntax errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log(`❌ [API-ALIGNED] Invalid UUID format: ${id}`);
      return res.status(400).json({ error: "Invalid application ID format" });
    }
    
    const result = await client.query(`
      SELECT 
        a.id,
        a.business_name,
        a.requested_amount as funding_amount,
        a.use_of_funds as purpose,
        a.status,
        a.form_data,
        a.contact_email,
        a.contact_phone,
        a.submission_country,
        a.created_at,
        a.updated_at,
        u.email,
        u.first_name,
        u.last_name
      FROM applications a
      LEFT JOIN users u ON a.user_id::uuid = u.id::uuid
      WHERE a.id::uuid = $1::uuid
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    const app = result.rows[0];
    
    res.json({ 
      success: true, 
      application: {
        id: app.id,
        business_name: app.business_name,
        funding_amount: app.funding_amount,
        purpose: app.purpose,
        status: app.status,
        contact_email: app.contact_email,
        contact_phone: app.contact_phone,
        country: app.submission_country,
        created_at: app.created_at,
        updated_at: app.updated_at,
        applicant: {
          email: app.email,
          first_name: app.first_name,
          last_name: app.last_name
        }
      }
    });
    
  } catch (error: unknown) {
    console.error("❌ [API-ALIGNED] Error fetching application:", error);
    res.status(500).json({ error: "Failed to fetch application" });
  } finally {
    await client.end();
  }
});

// POST /api/applications/:id/documents/upload - Upload documents
router.post("/applications/:id/documents/upload", upload.single("file"), async (req: Request, res: Response) => {
  const client = await pgc();
  try {
    console.log(`🔄 [API-ALIGNED] Document upload for application ${req.params.id}`);
    
    const { id: applicationId } = req.params;
    const { document_type } = req.body;
    const file = req.file;

    // Validate input
    if (!file) {
      return res.status(400).json({ 
        success: false, 
        message: "No file provided" 
      });
    }

    if (!document_type) {
      return res.status(400).json({ 
        success: false, 
        message: "document_type is required" 
      });
    }

    // Validate application exists
    const appResult = await client.query(`
      SELECT id FROM applications WHERE id = $1
    `, [applicationId]);
    
    if (appResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Application not found" 
      });
    }

    console.log(`✅ [API-ALIGNED] Application ${applicationId} validated`);

    // Upload to S3 (if S3Storage is available)
    let s3Url = null;
    try {
      const s3Storage = new S3Storage();
      const storageKey = await s3Storage.set(file.buffer, file.originalname, applicationId);
      s3Url = `s3://${storageKey}`;
      console.log(`✅ [API-ALIGNED] S3 upload successful: ${storageKey}`);
    } catch (s3Error) {
      console.warn(`⚠️ [API-ALIGNED] S3 upload failed, proceeding without S3: ${s3Error.message}`);
    }

    // Create document record
    const documentId = crypto.randomUUID();
    
    const docResult = await client.query(`
      INSERT INTO documents (
        id, 
        application_id, 
        file_name, 
        document_type, 
        file_size,
        mime_type,
        s3_key,
        status,
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded', now(), now())
      RETURNING id, status
    `, [
      documentId,
      applicationId,
      file.originalname,
      document_type,
      file.size,
      file.mimetype,
      s3Url
    ]);

    const document = docResult.rows[0];
    
    console.log(`✅ [API-ALIGNED] Document uploaded: ${document.id} for application ${applicationId}`);

    res.status(201).json({ 
      success: true,
      document: {
        id: document.id,
        status: document.status,
        message: "Document uploaded successfully"
      }
    });

  } catch (error: unknown) {
    console.error("❌ [API-ALIGNED] Document upload error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  } finally {
    await client.end();
  }
});

export default router;