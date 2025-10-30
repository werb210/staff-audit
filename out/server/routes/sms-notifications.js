import { Router } from "express";
import { pool } from "../db";
import { sendSMS } from "../utils/sms";
const router = Router();
// Send SMS notification when application stage changes
router.post("/stage-notification", async (req, res) => {
    try {
        const { applicationId, stage } = req.body;
        if (!applicationId || !stage) {
            return res.status(400).json({ error: "Missing applicationId or stage" });
        }
        // Get application and user details
        const appQuery = await pool.query(`
      SELECT a.id, a.business_name, u.phone, u.first_name, u.last_name
      FROM applications a
      LEFT JOIN users u ON u.id::text = a.user_id
      WHERE a.id = $1
    `, [applicationId]);
        if (!appQuery.rows.length) {
            return res.status(404).json({ error: "Application not found" });
        }
        const app = appQuery.rows[0];
        const phone = app.phone;
        if (!phone) {
            return res.json({ success: false, reason: "No phone number" });
        }
        // Prepare SMS message based on stage
        let message = "";
        const businessName = app.business_name || "your business";
        const clientName = app.first_name || "there";
        switch (stage) {
            case "In Review":
                message = `Hi ${clientName}! Great news - your ${businessName} application is now being reviewed by our underwriting team. We'll contact you soon with updates. - Boreal Financial`;
                break;
            case "Sent to Lender":
                message = `${clientName}, your ${businessName} application has been sent to our lending partners! You may receive calls from potential lenders. We're here to help throughout the process. - Boreal Financial`;
                break;
            default:
                return res.json({ success: false, reason: "No SMS for this stage" });
        }
        // Send SMS
        const smsResult = await sendSMS(phone, message);
        if (smsResult.success) {
            // Log the notification
            await pool.query(`
        INSERT INTO sms_logs (applicationId, phone, message, stage, status, sent_at)
        VALUES ($1, $2, $3, $4, 'sent', NOW())
      `, [applicationId, phone, message, stage]);
            console.log(`📱 SMS sent to ${phone} for ${stage} stage`);
            res.json({ success: true, messageSid: smsResult.messageSid });
        }
        else {
            console.error(`Failed to send SMS to ${phone}:`, smsResult.error);
            res.status(500).json({ success: false, error: smsResult.error });
        }
    }
    catch (error) {
        console.error("SMS notification error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
export default router;
