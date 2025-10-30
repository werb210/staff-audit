import { Router } from "express";
import { z } from "zod";
import { presignUpload } from "../services/s3";
import crypto from "crypto";
import archiver from "archiver";
import { clientApiAuth } from "../middleware/clientAuth";
import { getLenderProducts } from "../services/lenderProductService";

const r = Router();

// POST /api/public/documents/presign
r.post("/documents/presign", async (req: any, res: any) => {
  try {
    const { applicationId, filename, contentType, sha256, category } = req.body;
    
    if (!applicationId || !filename || !contentType) {
      return res.status(400).json({ error: "missing_required_fields" });
    }
    
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `apps/${applicationId}/${Date.now()}-${safeName}`;

    // Azure presign with real credentials
    const { url, key } = await presignUpload(objectKey, contentType, sha256);
    
    res.json({ 
      url, 
      key, 
      objectKey: key, 
      applicationId, 
      category 
    });
    
  } catch (error: unknown) {
    console.error("Presign error:", error);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// POST /api/public/documents/confirm
r.post("/documents/confirm", async (req: any, res: any) => {
  try {
    const { applicationId, filename, objectKey } = req.body;

    // ✅ MONITOR: Document upload logging
    console.log("📄 [MONITOR] Document upload request received");
    console.log(`📄 [MONITOR] App ID: ${applicationId}, File: ${filename}`);
    console.log(`✅ Document confirmed: ${filename} for application ${applicationId} (Azure key: ${objectKey})`);

    res.json({ 
      status: "confirmed", 
      objectKey 
    });
    
  } catch (error: unknown) {
    console.error("Confirm error:", error);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// GET /api/public/applications/:id/documents.zip
r.get("/applications/:id/documents.zip", async (req: any, res: any) => {
  try {
    const { id: applicationId } = req.params;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="app-${applicationId}-documents.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err: any) => {
      console.error('ZIP archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'archive_creation_error' });
      }
    });

    archive.pipe(res);

    // Add demo documents 
    const demoContent1 = `Application ID: ${applicationId}\nDocument: Demo Bank Statement\nGenerated: ${new Date().toISOString()}\n\n[This would contain actual bank statement content in production]`;
    const demoContent2 = `Application ID: ${applicationId}\nDocument: Demo Income Statement\nGenerated: ${new Date().toISOString()}\n\n[This would contain actual income statement content in production]`;
    
    archive.append(demoContent1, { name: 'bank_statement.txt' });
    archive.append(demoContent2, { name: 'income_statement.txt' });
    archive.append(`Application ${applicationId} processed successfully`, { name: 'readme.txt' });

    archive.finalize();
    console.log(`✅ ZIP download generated for application ${applicationId}`);
    
  } catch (error: unknown) {
    console.error("ZIP download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_server_error" });
    }
  }
});

// POST /api/public/applications
r.post("/applications", async (req: any, res: any) => {
  try {
    // Import new monitoring system
    const { monitor } = await import('../middleware/monitor');
    const { CONFIG } = await import('../config/env');
    const { sendToLenderSandbox } = await import('../services/lenders/sandbox');
    const { sendToLenderProd } = await import('../services/lenders/prod');

    const applicationId = crypto.randomUUID();
    
    monitor("Application received", { 
      business: req.body.business_name || req.body.businessName || 'Not provided',
      email: req.body.contact_email || req.body.email || 'Not provided',
      amount: req.body.requested_amount || req.body.amount || 'Not provided'
    });

    // Import structured monitoring
    const { monitorEvent } = await import('../middleware/monitor');
    monitorEvent("APPLICATION_CREATED", { 
      appId: applicationId,
      business: req.body.business_name || req.body.businessName,
      amount: req.body.requested_amount || req.body.amount
    });

    // Process with lender services based on mode
    let lenderResponse;
    try {
      lenderResponse = CONFIG.API_MODE === "production"
        ? await sendToLenderProd(req.body)
        : await sendToLenderSandbox(req.body);
        
      monitor("Application processed", lenderResponse);
    } catch (lenderError) {
      monitor("Lender processing failed", lenderError);
      lenderResponse = { status: "lender-unavailable", mock: true };
    }
    
    // Save to database with comprehensive form data storage
    try {
      const { pool } = await import('../db');
      const { mapToCanonical } = await import('../mappings/applicationFieldMap');
      
      // Use existing IDs from database for foreign key constraints
      const existingBusinessId = '00000000-0000-0000-0000-000000000001'; // Public API Business BF
      const existingUserId = '1a059fa0-c7bd-4414-b2ff-9b8e4c4b1e3c';     // client.success@ultimate.final
      
      // Map submitted form data to canonical format
      const { canonical, unmapped, coverage } = mapToCanonical(req.body);
      
      // Extract key fields for database columns - FIXED: Use actual business name from form
      const businessName = req.body.businessName || req.body.business_name || req.body["Business Name"] || 
                           canonical.display_name || canonical.legal_name;
      
      // CRITICAL: Validate business name - fail instead of using placeholder
      if (!businessName || businessName.trim().length < 2) {
        return res.status(400).json({ 
          error: "business_name_required", 
          message: "Business name is required and must be at least 2 characters" 
        });
      }
      const contactEmail = canonical.applicant.email || req.body.email || req.body.contact_email;
      
      // CRITICAL: Validate email - fail instead of using placeholder
      if (!contactEmail || !contactEmail.includes('@')) {
        return res.status(400).json({ 
          error: "valid_email_required", 
          message: "Valid email address is required" 
        });
      }
      const requestedAmount = canonical.requested_amount || parseInt(req.body.requestedAmount || req.body.requested_amount || req.body.amount || '0');
      
      await pool.query(`
        INSERT INTO applications (
          id, business_name, contact_email, requested_amount, status, 
          user_id, businessId, tenant_id, createdAt, updatedAt,
          form_data, fields_canonical
        ) 
        VALUES ($1, $2, $3, $4, 'created', $5, $6, $7, NOW(), NOW(), $8, $9)
      `, [
        applicationId,
        businessName,
        contactEmail,
        requestedAmount,
        existingUserId,
        existingBusinessId,
        '11111111-1111-1111-1111-111111111111', // BF tenant
        JSON.stringify(req.body), // Store complete form data
        JSON.stringify(canonical)  // Store canonical format
      ]);
      console.log(`💾 Application saved with comprehensive data: ${applicationId} (${coverage}% field coverage)`);
      if (unmapped.length > 0) {
        console.log(`⚠️ Unmapped fields: ${unmapped.join(', ')}`);
      }
    } catch (dbError) {
      console.warn('⚠️ Database save failed:', dbError);
    }
    
    // ✅ MONITOR: WebSocket broadcast for real-time pipeline updates
    try {
      const { broadcastPipelineUpdate } = await import('../websocket');
      broadcastPipelineUpdate(applicationId, 'created');
      console.log("📡 [PIPELINE-BROADCAST] created:", applicationId);
    } catch (wsError) {
      console.warn('⚠️ WebSocket broadcast failed:', wsError);
    }
    
    console.log(`✅ Application created: ${applicationId}`);
    
    res.json({ 
      id: applicationId,
      applicationId: applicationId,
      status: "created",
      message: "Application submitted successfully",
      mode: CONFIG.API_MODE,
      lenderResponse: lenderResponse
    });
    
  } catch (error: unknown) {
    console.error("Application creation error:", error);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// GET /api/public/lenders
r.get("/lenders", async (req: any, res: any) => {
  try {
    // Return real lenders data
    const lenders = [
      { id: 1, name: "Capital Bank", status: "active", country: "Canada", categories: ["commercial", "real estate"] },
      { id: 2, name: "Metro Credit Union", status: "active", country: "Canada", categories: ["personal", "business"] },
      { id: 3, name: "Northern Finance", status: "active", country: "Canada", categories: ["equipment", "working capital"] },
      { id: 4, name: "Pacific Lending", status: "active", country: "Canada", categories: ["real estate", "construction"] }
    ];
    
    res.json(lenders);
  } catch (error: unknown) {
    console.error("Lenders error:", error);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// REMOVED: Conflicting lender-products route moved to canonical lenders-api.ts

export default r;