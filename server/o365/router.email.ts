import { Router } from "express";
import { z } from "zod";
import { sendEmail, fetchNewInbox } from "./email.service";
import { logGraph } from "./graphClient";

const router = Router();

// Send email (from user or shared mailbox)
router.post("/send", async (req, res) => {
  try {
    const userId = (req as any).auth?.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }

    const schema = z.object({
      to: z.array(z.string().email()).min(1),
      cc: z.array(z.string().email()).optional(),
      bcc: z.array(z.string().email()).optional(),
      subject: z.string().min(1),
      html: z.string().optional(),
      text: z.string().optional(),
      fromShared: z.boolean().optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        contentBase64: z.string(),
        contentType: z.string()
      })).optional()
    });

    const body = schema.parse(req.body || {});
    
    await sendEmail(userId, body, { fromShared: body.fromShared });
    
    res.json({ ok: true, message: "Email sent successfully" });
  } catch (error: any) {
    console.error("[O365-EMAIL] Send error:", error);
    res.status(500).json({ ok: false, error: error?.message || "Failed to send email" });
  }
});

// Sync inbox (manual or cron)
router.post("/sync-inbox", async (req, res) => {
  try {
    const userId = (req as any).auth?.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }

    const useShared = !!req.body.useShared;
    await fetchNewInbox(userId, { useShared });
    
    res.json({ ok: true, message: "Inbox synced successfully" });
  } catch (error: any) {
    console.error("[O365-EMAIL] Sync error:", error);
    res.status(500).json({ ok: false, error: error?.message || "Failed to sync inbox" });
  }
});

// Get email status
router.get("/status", async (req, res) => {
  try {
    const userId = (req as any).auth?.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }

    // TODO: Check if user has email permissions and valid tokens
    const hasEmailAccess = false; // await checkEmailAccess(userId);
    
    res.json({
      ok: true,
      hasEmailAccess,
      sharedMailbox: process.env.MS_SHARED_MAILBOX || null,
      features: {
        send: true,
        receive: true,
        attachments: true,
        sharedMailbox: !!process.env.MS_SHARED_MAILBOX
      }
    });
  } catch (error: any) {
    console.error("[O365-EMAIL] Status error:", error);
    res.status(500).json({ ok: false, error: "Failed to get email status" });
  }
});

export default router;