import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db";
import { requestApproval } from "../../services/sms";
const router = Router();
const AppSchema = z.object({
    step1: z.object({
        fundingAmount: z.number().int().positive(),
        fundsPurpose: z.string(),
        country: z.string().length(2),
        currency: z.string().length(3)
    }),
    step3: z.object({
        businessName: z.string(),
        businessStructure: z.string().optional(),
        businessPhone: z.string(),
        businessEmail: z.string().email().optional(),
        industry: z.string().optional(),
        yearsInBusiness: z.number().int().optional(),
        revenueRange: z.string().optional()
    }),
    step4: z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
        ownershipPercentage: z.number().int().optional()
    }),
    consents: z.object({
        termsAccepted: z.boolean(),
        privacyAccepted: z.boolean()
    }).optional()
});
// Legacy schema for backward compatibility  
const legacyAppSchema = z.object({
    step1: z.object({
        requestedAmount: z.string().min(1).optional(),
        useOfFunds: z.string().min(1).optional()
    }).optional(),
    step3: z.object({
        businessName: z.string().min(1),
        businessEmail: z.string().email().optional(),
        businessPhone: z.string().optional()
    }).optional(),
    step4: z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional()
    }).optional()
});
router.post("/applications", async (req, res) => {
    try {
        console.log("📝 Received application:", req.body);
        // Try new schema first, fall back to legacy
        let parsed = AppSchema.safeParse(req.body);
        let isLegacy = false;
        if (!parsed.success) {
            const legacyParsed = legacyAppSchema.safeParse(req.body);
            if (!legacyParsed.success) {
                return res.status(400).json({
                    error: "invalid_payload",
                    issues: parsed.error.format()
                });
            }
            // Handle legacy format (existing working code)
            const legacy = legacyParsed.data;
            const contactEmail = legacy.step4?.email || "";
            if (!contactEmail) {
                return res.status(400).json({ error: "email_required" });
            }
            // Get business info (legacy)
            const businessId = "cbb7ee84-4b0c-43ac-a15c-efd9e2d6ed7e"; // Default BF business
            const tenantId = "7b98b7e5-6f8d-4b7a-b7b5-7e8c1f2a3d4e"; // Default BF tenant
            // Check if user exists, create if not
            const selU = `SELECT id FROM users WHERE email = $1 LIMIT 1`;
            const found = await pool.query(selU, [contactEmail]);
            let contactId = found.rows[0]?.id;
            if (!contactId) {
                const first = legacy.step4?.firstName ?? "";
                const last = legacy.step4?.lastName ?? "";
                const phone = legacy.step4?.phone ?? legacy.step3?.businessPhone ?? "000-000-0000";
                const insU = `
          INSERT INTO users (id, email, password_hash, phone, first_name, last_name, role, createdAt, updatedAt)
          VALUES (gen_random_uuid(), $1, 'public-api-no-password', $2, $3, $4, 'client', now(), now())
          RETURNING id
        `;
                const rU = await pool.query(insU, [contactEmail, phone, first, last]);
                contactId = rU.rows[0].id;
            }
            // Create application (legacy) - STRICT VALIDATION: NO PLACEHOLDERS
            const reqAmt = parseFloat(legacy.step1?.requestedAmount?.replace(/[^0-9.]/g, '') || "0") || 0;
            const useOfFunds = legacy.step1?.useOfFunds || "working capital";
            const businessName = legacy.step3?.businessName;
            // CRITICAL: FAIL if missing required data instead of using placeholders
            if (!businessName || businessName.trim().length < 2) {
                return res.status(400).json({
                    error: "business_name_required",
                    message: "Business name is required and must be at least 2 characters",
                    received: businessName
                });
            }
            if (reqAmt <= 0) {
                return res.status(400).json({
                    error: "valid_amount_required",
                    message: "Requested amount must be greater than 0",
                    received: reqAmt
                });
            }
            const insApp = `
        INSERT INTO applications (
          id, user_id, contact_id, businessId, tenant_id, business_name, 
          requested_amount, use_of_funds, status, createdAt, updatedAt
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'submitted', now(), now())
        RETURNING id, status
      `;
            const rApp = await pool.query(insApp, [
                contactId, contactId, businessId, tenantId, businessName, reqAmt, useOfFunds
            ]);
            const applicationId = rApp.rows[0].id;
            console.log(`✅ Created legacy application ${applicationId} for ${businessName}`);
            return res.status(201).json({
                ok: true,
                id: applicationId,
                status: rApp.rows[0].status
            });
        }
        // Handle new canonical format
        const { step1, step3, step4 } = parsed.data;
        // Minimal: upsert user then create application
        const user = await pool.query(`
      INSERT INTO users (email, phone, first_name, last_name, role, createdAt, updatedAt)
      VALUES ($1,$2,$3,$4,'client',now(),now())
      ON CONFLICT (email) DO UPDATE SET phone=EXCLUDED.phone
      RETURNING id
    `, [step4.email, step4.phone, step4.firstName, step4.lastName]);
        const userId = user.rows[0].id;
        const app = await pool.query(`
      INSERT INTO applications (user_id, business_name, funding_amount, purpose, country, currency, status, createdAt, updatedAt)
      VALUES ($1,$2,$3,$4,$5,$6,'submitted',now(),now())
      RETURNING id, status
    `, [userId, step3.businessName, step1.fundingAmount, step1.fundsPurpose, step1.country, step1.currency]);
        const applicationId = app.rows[0].id;
        // Stage automation: "new_submitted" -> approval gate
        await requestApproval(`[APPROVAL] New application submitted: ${step3.businessName} (${applicationId}) — OK to notify client?`);
        console.log(`✅ Created canonical application ${applicationId} for ${step3.businessName}`);
        res.status(201).json({
            applicationId,
            status: app.rows[0].status
        });
    }
    catch (error) {
        console.error("❌ Application creation error:", error);
        res.status(500).json({ error: "internal_server_error" });
    }
});
export default router;
