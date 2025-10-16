import { Router } from "express";
import { requireAuth } from "../auth/verifyOnly";
import { db } from "../db/drizzle";
import { applications, audits } from "../db/schema";
import { eq } from "drizzle-orm";
import twilio from "twilio";

const r = Router();
r.use(requireAuth);

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const BF_PHONE = process.env.BF_PHONE_E164 || "+18254511768";

// SMS templates for each stage
const SMS_TEMPLATES = {
  submitted: "Your application has been submitted and is under review. We'll update you on progress.",
  in_review: "Your application is currently in review. Our team is analyzing your documents.",
  doc_rejected: "Some documents need attention. Please check your portal for details and resubmit.",
  docs_accepted: "All documents have been accepted! Your application is moving forward.",
  sent_to_lender: "Great news! Your application has been sent to our lending partners for consideration."
};

r.get("/", async (req: any, res: any) => {
  try {
    const apps = await db.select().from(applications);
    res.json({ ok: true, items: apps });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

r.post("/:appId/transition", async (req: any, res: any) => {
  try {
    const { appId } = req.params;
    const { stage } = req.body || {};
    
    if (!stage || !SMS_TEMPLATES[stage as keyof typeof SMS_TEMPLATES]) {
      return res.status(400).json({ ok: false, error: "Invalid stage" });
    }

    // Update application stage
    await db.update(applications).set({ stage }).where(eq(applications.id, appId));
    
    // Log audit
    await db.insert(audits).values({
      type: 'stage_transition',
      entity: 'application',
      entityId: appId,
      // @ts-ignore
      userId: req.user?.sub,
      data: JSON.stringify({ newStage: stage })
    });

    // Send SMS notification (if contact has phone)
    const [app] = await db.select().from(applications).where(eq(applications.id, appId));
    if (app?.contactId) {
      // In real implementation, would join with contacts table to get phone
      // For now, just log that we would send SMS
      console.log(`[SMS] Would send to contact ${app.contactId}: ${SMS_TEMPLATES[stage as keyof typeof SMS_TEMPLATES]}`);
    }

    res.json({ ok: true, stage });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /api/pipeline - List all applications
r.get("/", async (req: any, res: any) => {
  try {
    const rows = await db.select().from(applications);
    console.info("[pipeline] listed", rows.length, "applications");
    res.json({ ok: true, items: rows });
  } catch (error: any) {
    console.error("[PIPELINE] List error:", error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

export default r;