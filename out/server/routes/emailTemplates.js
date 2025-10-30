import { Router } from "express";
import { communicationsDB } from "../lib/communicationsStore";
import { sendTrackedEmail } from "../services/emailTracking";
const router = Router();
// Get all email templates
router.get("/templates", (req, res) => {
    try {
        const templates = communicationsDB.listTemplates();
        res.json({ success: true, templates });
    }
    catch (error) {
        console.error("Error fetching templates:", error);
        res.status(500).json({ success: false, error: "Failed to fetch templates" });
    }
});
// Create or update email template
router.post("/templates", (req, res) => {
    try {
        const { id, name, subject, html } = req.body;
        if (!name || !subject || !html) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: name, subject, html"
            });
        }
        const template = communicationsDB.upsertTemplate({ id, name, subject, html });
        res.json({ success: true, template });
    }
    catch (error) {
        console.error("Error saving template:", error);
        if (error instanceof Error && error instanceof Error ? error.message : String(error) === "Template not found") {
            res.status(404).json({ success: false, error: "Template not found" });
        }
        else {
            res.status(500).json({ success: false, error: "Failed to save template" });
        }
    }
});
// Delete email template
router.delete("/templates/:id", (req, res) => {
    try {
        const { id } = req.params;
        communicationsDB.deleteTemplate(id);
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting template:", error);
        res.status(500).json({ success: false, error: "Failed to delete template" });
    }
});
// Get email settings
router.get("/settings", (req, res) => {
    try {
        const settings = communicationsDB.getEmailSettings();
        res.json({ success: true, settings });
    }
    catch (error) {
        console.error("Error fetching email settings:", error);
        res.status(500).json({ success: false, error: "Failed to fetch email settings" });
    }
});
// Update email settings
router.post("/settings", (req, res) => {
    try {
        const settings = communicationsDB.updateEmailSettings(req.body);
        res.json({ success: true, settings });
    }
    catch (error) {
        console.error("Error updating email settings:", error);
        res.status(500).json({ success: false, error: "Failed to update email settings" });
    }
});
// Test email send
router.post("/test-send", async (req, res) => {
    try {
        const { to } = req.body;
        if (!to) {
            return res.status(400).json({ success: false, error: "Missing recipient email" });
        }
        const result = await sendTrackedEmail({
            contactId: "test-email",
            to,
            subject: "Boreal Financial - Test Email",
            html: "<p>This is a test email from the Boreal Financial Staff Application.</p><p>If you received this, the email system is working correctly.</p>"
        });
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error("Error sending test email:", error);
        res.status(500).json({ success: false, error: "Failed to send test email" });
    }
});
export default router;
