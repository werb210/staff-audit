import { Router, Request, Response } from "express";
import { pool } from "../db";
import { z } from "zod";
import { clientApiAuth } from "../middleware/clientAuth";
import { getLenderProducts } from "../controllers/lenderProductsController";

const router = Router();

// ===== LENDER PRODUCTS API =====
// ✅ Secure lender products - requires document approval for applicationId queries  
// Note: API key authentication used here, but endpoint also supports session-based access in other contexts
router.get("/lender-products", clientApiAuth, getLenderProducts);

// ===== APPLICATION SUBMISSION API =====
const ApplicationSchema = z.object({
  step1: z.object({
    fundingAmount: z.number().positive(),
    fundsPurpose: z.string().min(1),
    country: z.string().length(2),
    currency: z.string().length(3).default("CAD")
  }),
  step3: z.object({
    businessName: z.string().min(1),
    businessPhone: z.string().optional(),
    businessEmail: z.string().email().optional(),
    industry: z.string().optional(),
    yearsInBusiness: z.number().int().min(0).optional(),
    revenueRange: z.string().optional()
  }),
  step4: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    ownershipPercentage: z.number().min(1).max(100).optional()
  }),
  consents: z.object({
    termsAccepted: z.boolean().default(true),
    privacyAccepted: z.boolean().default(true)
  }).optional()
});

router.post("/applications", async (req: Request, res: Response) => {
  try {
    console.log("📝 [CLIENT-API] Received application submission:", req.body);
    
    const parsed = ApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "invalid_payload", 
        issues: parsed.error.format() 
      });
    }

    const { step1, step3, step4 } = parsed.data;

    // Create or update user (include password_hash as NULL for clients)
    const userResult = await pool.query(`
      INSERT INTO users (email, phone, first_name, last_name, role, password_hash, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, 'client', NULL, now(), now())
      ON CONFLICT (email) DO UPDATE SET 
        phone = EXCLUDED.phone,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updatedAt = now()
      RETURNING id
    `, [step4.email, step4.phone, step4.firstName, step4.lastName]);
    
    const userId = userResult.rows[0].id;

    // Create application using correct schema
    const businessId = randomUUID(); // Generate business ID 
    const tenantId = randomUUID(); // Generate tenant ID (UUID required)
    const appResult = await pool.query(`
      INSERT INTO applications (
        user_id, businessId, tenant_id, requested_amount, use_of_funds, 
        status, form_data, createdAt, updatedAt
      )
      VALUES ($1, $2, $3, $4, $5, 'submitted', $6, now(), now())
      RETURNING id, status, createdAt
    `, [
      userId, 
      businessId, 
      tenantId,
      step1.fundingAmount, 
      step1.fundsPurpose,
      JSON.stringify({
        businessName: step3.businessName,
        businessPhone: step3.businessPhone, 
        businessEmail: step3.businessEmail,
        industry: step3.industry,
        country: step1.country,
        currency: step1.currency
      })
    ]);

    const application = appResult.rows[0];
    
    console.log(`✅ [CLIENT-API] Created application ${application.id} for ${step3.businessName}`);

    res.status(201).json({ 
      success: true,
      application: {
        id: application.id,
        status: application.status,
        createdAt: application.createdAt
      }
    });

  } catch (error: unknown) {
    console.error("❌ [CLIENT-API] Application submission error:", error);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// ===== APPLICATION STATUS API =====
router.get("/applications/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        a.id,
        a.business_name,
        a.funding_amount,
        a.purpose,
        a.status,
        a.createdAt,
        a.updatedAt,
        u.email,
        u.first_name,
        u.last_name
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    res.json({ success: true, application: result.rows[0] });
    
  } catch (error: unknown) {
    console.error("❌ [CLIENT-API] Error fetching application:", error);
    res.status(500).json({ error: "Failed to fetch application" });
  }
});

// ===== DOCUMENT UPLOAD API =====
const DocumentUploadSchema = z.object({
  applicationId: z.string().uuid(),
  documentType: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1),
  base64Data: z.string().min(1).optional(),
  uploadUrl: z.string().url().optional()
});

router.post("/documents/upload", async (req: Request, res: Response) => {
  try {
    console.log("📄 [CLIENT-API] Document upload request");
    
    const parsed = DocumentUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "invalid_payload", 
        issues: parsed.error.format() 
      });
    }

    const { applicationId, documentType, fileName, fileSize, mimeType } = parsed.data;

    // Verify application exists
    const appCheck = await pool.query(`
      SELECT id FROM applications WHERE id = $1
    `, [applicationId]);
    
    if (appCheck.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Create document record
    const docResult = await pool.query(`
      INSERT INTO documents (
        id, applicationId, name, file_type, size, mime_type,
        status, createdAt, updatedAt
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'uploaded', now(), now())
      RETURNING id, status
    `, [applicationId, fileName, documentType, fileSize, mimeType]);

    const document = docResult.rows[0];
    
    console.log(`✅ [CLIENT-API] Document uploaded: ${document.id} for application ${applicationId}`);

    res.status(201).json({ 
      success: true,
      document: {
        id: document.id,
        status: document.status,
        message: "Document uploaded successfully"
      }
    });

  } catch (error: unknown) {
    console.error("❌ [CLIENT-API] Document upload error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// ===== CHAT / TALK TO HUMAN API =====
const ChatMessageSchema = z.object({
  applicationId: z.string().uuid().optional(),
  email: z.string().email(),
  name: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  category: z.enum(['general_inquiry', 'application_help', 'technical_issue', 'complaint']).default('general_inquiry')
});

router.post("/chat/start", async (req: Request, res: Response) => {
  try {
    console.log("💬 [CLIENT-API] Starting chat session");
    
    const parsed = ChatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "invalid_payload", 
        issues: parsed.error.format() 
      });
    }

    const { applicationId, email, name, message, priority, category } = parsed.data;
    
    // Create chat session
    const sessionResult = await pool.query(`
      INSERT INTO chat_sessions (
        id, applicationId, user_email, user_name, initial_message,
        priority, category, status, createdAt, updatedAt
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'open', now(), now())
      RETURNING id, status
    `, [applicationId, email, name, message, priority, category]);

    const session = sessionResult.rows[0];
    
    console.log(`✅ [CLIENT-API] Chat session started: ${session.id}`);

    res.status(201).json({ 
      success: true,
      session: {
        id: session.id,
        status: session.status,
        message: "Chat session started. A staff member will respond shortly."
      }
    });

  } catch (error: unknown) {
    console.error("❌ [CLIENT-API] Chat start error:", error);
    res.status(500).json({ error: "Failed to start chat session" });
  }
});

// ===== ISSUE REPORTING API =====
const IssueReportSchema = z.object({
  applicationId: z.string().uuid().optional(),
  email: z.string().email(),
  name: z.string().min(1),
  issueType: z.enum(['bug', 'feature_request', 'complaint', 'other']).default('bug'),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  browserInfo: z.string().optional(),
  currentUrl: z.string().url().optional()
});

router.post("/issues/report", async (req: Request, res: Response) => {
  try {
    console.log("🐛 [CLIENT-API] Issue report received");
    
    const parsed = IssueReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "invalid_payload", 
        issues: parsed.error.format() 
      });
    }

    const { applicationId, email, name, issueType, title, description, severity, browserInfo, currentUrl } = parsed.data;
    
    // Create issue report
    const issueResult = await pool.query(`
      INSERT INTO issue_reports (
        id, applicationId, reporter_email, reporter_name, issue_type,
        title, description, severity, browser_info, current_url,
        status, createdAt, updatedAt
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', now(), now())
      RETURNING id, status
    `, [applicationId, email, name, issueType, title, description, severity, browserInfo, currentUrl]);

    const issue = issueResult.rows[0];
    
    console.log(`✅ [CLIENT-API] Issue reported: ${issue.id} - ${title}`);

    res.status(201).json({ 
      success: true,
      issue: {
        id: issue.id,
        status: issue.status,
        message: "Issue reported successfully. Our team will investigate and respond."
      }
    });

  } catch (error: unknown) {
    console.error("❌ [CLIENT-API] Issue report error:", error);
    res.status(500).json({ error: "Failed to report issue" });
  }
});

// ===== HEALTH CHECK API =====
router.get("/health", (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    service: "client-api",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /lender-products",
      "POST /applications",
      "GET /applications/:id", 
      "POST /documents/upload",
      "POST /chat/start",
      "POST /issues/report"
    ]
  });
});

export default router;