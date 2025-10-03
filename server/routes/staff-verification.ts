import express from "express";
import { db } from "../db";
import { applications } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

/**
 * STAFF REQUIREMENT 5: Database Status Verification
 * Check applications table status after webhook completion
 */
router.get("/db-status/:applicationId", async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    
    console.log(`🔍 [Staff Verification] Checking database status for application: ${applicationId}`);
    
    // Query application status from database
    const application = await db
      .select({ 
        id: applications.id,
        status: applications.status, 
        signed: applications.signed,
        signingStatus: applications.signingStatus,
        signedAt: applications.signedAt,
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!application.length) {
      return res.status(404).json({
        error: "Application not found",
        applicationId
      });
    }

    const app = application[0];
    
    console.log(`✅ [Staff Verification] Database status retrieved:`, {
      applicationId: app.id,
      status: app.status,
      signed: app.signed,
      signingStatus: app.signingStatus,
      signedAt: app.signedAt
    });

    // STAFF REQUIREMENT: Confirm status is "signed" or "approved"
    const isValidStatus = app.status === "signed" || app.status === "approved";
    
    res.json({
      success: true,
      applicationId: app.id,
      status: app.status,
      signed: app.signed,
      signingStatus: app.signingStatus,
      signedAt: app.signedAt,
      validation: {
        isValidStatus,
        expectedStatuses: ["signed", "approved"],
        message: isValidStatus 
          ? "✅ Status is valid (signed or approved)" 
          : "❌ Status should be 'signed' or 'approved'"
      }
    });

  } catch (error: unknown) {
    console.error(`❌ [Staff Verification] Database status check failed:`, error);
    res.status(500).json({
      error: "Database query failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;