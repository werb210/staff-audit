import { Router } from 'express';
import { db } from '../db';
import { emailMessages } from '../../shared/schema';
import { desc } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';
const router = Router();
// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}
// POST /api/communication/email/send - Send email
router.post('/send', async (req, res) => {
    try {
        const { to, subject, body } = req.body;
        if (!to || !subject || !body) {
            return res.status(400).json({
                success: false,
                error: 'To, subject, and body are required'
            });
        }
        if (!process.env.SENDGRID_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'SendGrid API key not configured'
            });
        }
        console.log(`📧 [EMAIL] Sending email to ${to}`);
        const emailData = {
            to,
            from: process.env.EMAIL_FROM_ADDRESS || 'support@boreal.financial',
            subject,
            text: body,
            html: body.replace(/\n/g, '<br>')
        };
        // Send email via SendGrid
        const [response] = await sgMail.send(emailData);
        // Save email to database using Drizzle
        await db.insert(emailMessages).values({
            fromAddress: process.env.EMAIL_FROM_ADDRESS || 'support@boreal.financial',
            toAddresses: [to],
            subject,
            body,
            bodyText: body,
            bodyHtml: body.replace(/\n/g, '<br>'),
            isSent: true,
            messageDate: new Date(),
            messageId: response.headers['x-message-id']
        });
        console.log(`✅ [EMAIL] Email sent successfully: ${response.headers['x-message-id']}`);
        res.json({
            success: true,
            email: {
                recipient: to,
                subject,
                status: 'sent',
                message_id: response.headers['x-message-id']
            }
        });
    }
    catch (error) {
        console.error('❌ [EMAIL] Send error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send email',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// GET /api/communication/email - Get email history
router.get('/', async (req, res) => {
    try {
        console.log('📧 [EMAIL] Fetching email history');
        const emails = await db.select()
            .from(emailMessages)
            .orderBy(desc(emailMessages.createdAt))
            .limit(50);
        res.json({
            success: true,
            emails: emails || []
        });
    }
    catch (error) {
        console.error('❌ [EMAIL] Fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch emails',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
export default router;
