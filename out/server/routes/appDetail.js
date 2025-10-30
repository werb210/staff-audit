import { Router } from "express";
export const appDetailRouter = Router();
// Development-only bypass for testing (disable auth for demo)
if (process.env.NODE_ENV !== "production") {
    appDetailRouter.use((req, res, next) => {
        console.log(`[APP-DETAIL] Demo access: ${req.method} ${req.path}`);
        next();
    });
}
// Helpers (replace with your real DB client)
const db = (req) => req.app.locals.db;
// 1) LEFT: full application info (condense in UI if needed)
appDetailRouter.get("/:appId/overview", async (req, res) => {
    const { appId } = req.params;
    try {
        // Mock response for now - replace with actual database query
        const appRec = {
            id: appId,
            applicant_name: "John Smith",
            business_name: "Smith & Associates LLC",
            email: "john@smithassoc.com",
            phone: "+1-555-0123",
            request_amount: 150000,
            stage: "document_review",
            docs_complete: false
        };
        res.json({ application: appRec });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch application overview" });
    }
});
// 2) MIDDLE: combined timeline (CRM + system)
appDetailRouter.get("/:appId/timeline", async (req, res) => {
    const { appId } = req.params;
    try {
        // Mock timeline data - replace with actual database query
        const rows = [
            {
                id: 1,
                applicationId: appId,
                kind: "email_sent",
                direction: "out",
                title: "Welcome email sent",
                body: "<p>Welcome to our loan application process.</p>",
                occurred_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                actor_staff_id: "staff-1",
                meta: { to: "john@smithassoc.com" }
            },
            {
                id: 2,
                applicationId: appId,
                kind: "doc_uploaded",
                title: "Bank statements uploaded",
                body: "3 months of bank statements received",
                occurred_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                actor_staff_id: null,
                meta: { document_count: 3 }
            }
        ];
        res.json({ value: rows });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch timeline" });
    }
});
// Composer endpoints to create activities + trigger integrations
// 2a) Email (Office 365) + record activity
appDetailRouter.post("/:appId/actions/email", async (req, res) => {
    const { appId } = req.params;
    const { to, subject, html, staffUserId } = req.body;
    try {
        // Mock MS account lookup - replace with actual database
        const acc = { access_token: "mock_token" };
        if (!acc?.access_token) {
            return res.status(400).json({ error: "Microsoft account not linked" });
        }
        // For now, skip actual Graph API call in development
        console.log(`Would send email to ${to} with subject: ${subject}`);
        const act = {
            id: Date.now(),
            applicationId: appId,
            actor_staff_id: staffUserId,
            kind: "email_sent",
            direction: "out",
            title: subject,
            body: html,
            occurred_at: new Date().toISOString(),
            meta: { to }
        };
        res.json({ ok: true, activity: act });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to send email" });
    }
});
// 2b) Task (Office 365 To Do) + record activity
appDetailRouter.post("/:appId/actions/task", async (req, res) => {
    const { appId } = req.params;
    const { title, html, staffUserId } = req.body;
    try {
        // Mock MS account lookup
        const acc = { access_token: "mock_token" };
        if (!acc?.access_token) {
            return res.status(400).json({ error: "Microsoft account not linked" });
        }
        console.log(`Would create task: ${title}`);
        const act = {
            id: Date.now(),
            applicationId: appId,
            actor_staff_id: staffUserId,
            kind: "task",
            title,
            body: html || "",
            occurred_at: new Date().toISOString(),
            meta: { ms_task_id: "mock_task_id" }
        };
        res.json({ ok: true, activity: act });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create task" });
    }
});
// 2c) Call (Twilio) + record activity
appDetailRouter.post("/:appId/actions/call", async (req, res) => {
    const { appId } = req.params;
    const { to, twimlUrl, staffUserId } = req.body;
    try {
        console.log(`Would place call to ${to}`);
        const act = {
            id: Date.now(),
            applicationId: appId,
            actor_staff_id: staffUserId,
            kind: "call_out",
            direction: "out",
            title: `Call to ${to}`,
            occurred_at: new Date().toISOString(),
            meta: { to, sid: "mock_call_sid" }
        };
        res.json({ ok: true, activity: act });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to place call" });
    }
});
// 2d) SMS (Twilio) + record activity
appDetailRouter.post("/:appId/actions/sms", async (req, res) => {
    const { appId } = req.params;
    const { to, body, staffUserId } = req.body;
    try {
        console.log(`Would send SMS to ${to}: ${body}`);
        const act = {
            id: Date.now(),
            applicationId: appId,
            actor_staff_id: staffUserId,
            kind: "sms_out",
            direction: "out",
            title: `SMS to ${to}`,
            body,
            occurred_at: new Date().toISOString(),
            meta: { to, sid: "mock_sms_sid" }
        };
        res.json({ ok: true, activity: act });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to send SMS" });
    }
});
// 3) RIGHT: deal summary (pipeline snapshot)
appDetailRouter.get("/:appId/deal", async (req, res) => {
    const { appId } = req.params;
    try {
        // Mock deal summary
        const row = {
            id: 1,
            applicationId: appId,
            stage: "document_review",
            amount_cents: 15000000, // $150,000
            lender_name: "First National Bank",
            updatedAt: new Date().toISOString()
        };
        res.json({ deal: row });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch deal summary" });
    }
});
// 4) RIGHT: email attachments only
appDetailRouter.get("/:appId/email-attachments", async (req, res) => {
    const { appId } = req.params;
    try {
        // Mock email attachments
        const rows = [
            {
                id: 1,
                activity_id: 1,
                filename: "bank_statements_q1.pdf",
                url: "/uploads/bank_statements_q1.pdf",
                size_bytes: 245760
            },
            {
                id: 2,
                activity_id: 1,
                filename: "tax_returns_2023.pdf",
                url: "/uploads/tax_returns_2023.pdf",
                size_bytes: 512000
            }
        ];
        res.json({ value: rows });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch email attachments" });
    }
});
export default appDetailRouter;
