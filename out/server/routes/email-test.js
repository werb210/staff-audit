import { Router } from "express";
const router = Router();
// SendGrid email test endpoint from OIB
router.post("/test", async (req, res) => {
    try {
        const { to, subject = "SendGrid Test", text = "Test email from Boreal Financial CRM" } = req.body;
        if (!to) {
            return res.status(400).json({ error: "Email 'to' field is required" });
        }
        // Check if SendGrid is configured
        if (!process.env.SENDGRID_API_KEY) {
            return res.status(503).json({
                error: "SendGrid not configured",
                detail: "SENDGRID_API_KEY environment variable missing"
            });
        }
        // Lazy import SendGrid for compatibility
        const sgMail = (await import("@sendgrid/mail")).default;
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
            to,
            from: process.env.SENDGRID_DEFAULT_FROM || "Boreal Financial <noreply@boreal.financial>",
            subject,
            text,
        };
        await sgMail.send(msg);
        res.json({
            ok: true,
            message: `Test email sent to ${to}`,
            from: msg.from
        });
    }
    catch (error) {
        console.error('SendGrid test error:', error?.response?.body || error?.message);
        res.status(500).json({
            error: "Failed to send test email",
            detail: error?.response?.body?.errors?.[0]?.message || error?.message
        });
    }
});
export default router;
