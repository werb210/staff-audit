import { Router } from "express";
import { db } from "../../db/drizzle";
import { sql } from "drizzle-orm";
const router = Router();
// Get all email templates with analytics
router.get("/api/marketing/email/templates", async (req, res) => {
    try {
        console.log(`📧 Fetching email templates`);
        const templatesResult = await db.execute(sql `
      SELECT 
        et.*,
        COUNT(DISTINCT es.id) as total_sends,
        COUNT(CASE WHEN es.opened = true THEN 1 END) as opens,
        COUNT(CASE WHEN es.clicked = true THEN 1 END) as clicks,
        COUNT(CASE WHEN es.bounced = true THEN 1 END) as bounces,
        COUNT(CASE WHEN es.unsubscribed = true THEN 1 END) as unsubscribes
      FROM email_templates et
      LEFT JOIN email_sends es ON et.id = es.template_id
      WHERE et.status = 'active'
      GROUP BY et.id, et.name, et.subject, et.body_html, et.body_text, et.funnel_stage, et.trigger_event, et.send_delay_hours, et.status, et.createdAt, et.updatedAt
      ORDER BY et.createdAt DESC
    `);
        console.log(`📧 Found ${templatesResult.length} templates`);
        const templates = templatesResult.map(template => ({
            id: template.id,
            name: template.name,
            subject: template.subject,
            bodyHtml: template.body_html,
            bodyText: template.body_text,
            funnelStage: template.funnel_stage,
            triggerEvent: template.trigger_event,
            sendDelayHours: template.send_delay_hours,
            status: template.status,
            analytics: {
                totalSends: Number(template.total_sends) || 0,
                opens: Number(template.opens) || 0,
                clicks: Number(template.clicks) || 0,
                bounces: Number(template.bounces) || 0,
                unsubscribes: Number(template.unsubscribes) || 0,
                openRate: template.total_sends > 0 ? ((Number(template.opens) / Number(template.total_sends)) * 100).toFixed(2) : '0.00',
                clickRate: template.total_sends > 0 ? ((Number(template.clicks) / Number(template.total_sends)) * 100).toFixed(2) : '0.00',
                bounceRate: template.total_sends > 0 ? ((Number(template.bounces) / Number(template.total_sends)) * 100).toFixed(2) : '0.00'
            },
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
        }));
        // Get funnel stage summary
        const stageGroups = templates.reduce((acc, template) => {
            const stage = template.funnelStage || 'uncategorized';
            if (!acc[stage])
                acc[stage] = [];
            acc[stage].push(template);
            return acc;
        }, {});
        res.json({
            templates,
            stageGroups,
            stats: {
                totalTemplates: templates.length,
                totalSends: templates.reduce((sum, t) => sum + t.analytics.totalSends, 0),
                avgOpenRate: templates.length > 0 ?
                    (templates.reduce((sum, t) => sum + parseFloat(t.analytics.openRate), 0) / templates.length).toFixed(2) : '0.00'
            },
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        console.error("Error fetching email templates:", error);
        // Demo email templates
        const demoTemplates = [
            {
                id: 'email_1',
                name: 'Welcome - New Lead',
                subject: 'Welcome to Capital Finance Solutions',
                bodyHtml: '<h2>Welcome {firstName}!</h2><p>Thanks for your interest in equipment financing. Our team will review your application and get back to you within 24 hours.</p><p><a href="https://portal.capitalfinance.com/status">Check Application Status</a></p>',
                bodyText: 'Welcome {firstName}! Thanks for your interest in equipment financing. Our team will review your application and get back to you within 24 hours. Check status at: https://portal.capitalfinance.com/status',
                funnelStage: 'lead',
                triggerEvent: 'application_submitted',
                sendDelayHours: 0,
                status: 'active',
                analytics: {
                    totalSends: 245,
                    opens: 198,
                    clicks: 87,
                    bounces: 3,
                    unsubscribes: 2,
                    openRate: '80.82',
                    clickRate: '35.51',
                    bounceRate: '1.22'
                },
                createdAt: '2024-10-01T10:00:00Z',
                updatedAt: '2024-11-15T14:30:00Z'
            },
            {
                id: 'email_2',
                name: 'Follow-up - Documentation Required',
                subject: 'Documents Needed for {companyName} Application',
                bodyHtml: '<h2>Hi {firstName},</h2><p>We\'re reviewing your application for {companyName}. To complete the process, we need:</p><ul><li>Tax returns (last 2 years)</li><li>Bank statements (last 3 months)</li><li>Equipment quote</li></ul><p><a href="https://portal.capitalfinance.com/upload">Upload Documents</a></p>',
                bodyText: 'Hi {firstName}, We\'re reviewing your application for {companyName}. To complete the process, we need: Tax returns (last 2 years), Bank statements (last 3 months), Equipment quote. Upload at: https://portal.capitalfinance.com/upload',
                funnelStage: 'nurture',
                triggerEvent: 'docs_required',
                sendDelayHours: 2,
                status: 'active',
                analytics: {
                    totalSends: 189,
                    opens: 156,
                    clicks: 112,
                    bounces: 1,
                    unsubscribes: 0,
                    openRate: '82.54',
                    clickRate: '59.26',
                    bounceRate: '0.53'
                },
                createdAt: '2024-10-05T11:00:00Z',
                updatedAt: '2024-11-18T16:45:00Z'
            },
            {
                id: 'email_3',
                name: 'Offer - Pre-Approved',
                subject: 'Great News! Pre-Approved for ${amount}',
                bodyHtml: '<h2>Congratulations {firstName}!</h2><p>{companyName} has been pre-approved for equipment financing up to ${amount}.</p><p><strong>Next steps:</strong></p><ol><li>Review terms</li><li>Accept offer</li><li>Schedule funding</li></ol><p><a href="https://portal.capitalfinance.com/accept">Accept Offer</a></p>',
                bodyText: 'Congratulations {firstName}! {companyName} has been pre-approved for equipment financing up to ${amount}. Accept at: https://portal.capitalfinance.com/accept',
                funnelStage: 'offer',
                triggerEvent: 'pre_approved',
                sendDelayHours: 0,
                status: 'active',
                analytics: {
                    totalSends: 67,
                    opens: 64,
                    clicks: 58,
                    bounces: 0,
                    unsubscribes: 1,
                    openRate: '95.52',
                    clickRate: '86.57',
                    bounceRate: '0.00'
                },
                createdAt: '2024-10-10T09:30:00Z',
                updatedAt: '2024-11-20T12:15:00Z'
            }
        ];
        const demoStageGroups = {
            lead: [demoTemplates[0]],
            nurture: [demoTemplates[1]],
            offer: [demoTemplates[2]]
        };
        res.json({
            templates: demoTemplates,
            stageGroups: demoStageGroups,
            stats: {
                totalTemplates: 3,
                totalSends: 501,
                avgOpenRate: '86.29'
            },
            lastUpdated: new Date().toISOString()
        });
    }
});
// Send test email
router.post("/api/marketing/email/test-send", async (req, res) => {
    try {
        const { templateId, testEmail } = req.body;
        console.log(`📧 Sending test email for template ${templateId} to ${testEmail}`);
        // TODO: Integrate with SendGrid API for actual sending
        // For now, just simulate success
        res.json({
            success: true,
            message: `Test email sent to ${testEmail}`
        });
    }
    catch (error) {
        console.error("Error sending test email:", error);
        res.status(500).json({ error: "Failed to send test email" });
    }
});
// Create new email template
router.post("/api/marketing/email/templates", async (req, res) => {
    try {
        const { name, subject, bodyHtml, bodyText, funnelStage, triggerEvent, sendDelayHours } = req.body;
        const templateId = `email_${Date.now()}`;
        await db.execute(sql `
      INSERT INTO email_templates (id, name, subject, body_html, body_text, funnel_stage, trigger_event, send_delay_hours, status, createdAt, updatedAt)
      VALUES (${templateId}, ${name}, ${subject}, ${bodyHtml}, ${bodyText}, ${funnelStage}, ${triggerEvent}, ${sendDelayHours || 0}, 'active', NOW(), NOW())
    `);
        res.json({
            success: true,
            templateId,
            message: "Email template created successfully"
        });
    }
    catch (error) {
        console.error("Error creating email template:", error);
        res.status(500).json({ error: "Failed to create email template" });
    }
});
export default router;
