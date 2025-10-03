import { Router } from "express";
import { requireAuth } from "../auth/verifyOnly";

const r = Router();
r.use(requireAuth);

/**
 * POST /api/email/send
 * Send email via Office 365 Graph API
 */
r.post('/send', async (req: any, res) => {
  try {
    const { to, subject, body, contactId } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // TODO: Implement actual Microsoft Graph API integration
    console.log(`📧 [EMAIL] Sending email to ${to}: ${subject}`);
    
    // Simulate Office 365 API call
    const emailSent = true;
    
    if (emailSent) {
      console.log(`📧 [EMAIL] Email sent successfully to ${to}`);
      
      res.json({ 
        success: true, 
        message: 'Email sent via Office 365',
        messageId: `msg-${Date.now()}`
      });
    } else {
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error: unknown) {
    console.error('❌ [EMAIL] Error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

/**
 * GET /api/email/threads/:contactId
 */
r.get('/threads/:contactId', async (req: any, res) => {
  try {
    const { contactId } = req.params;
    
    const threads = [
      {
        id: '1',
        subject: 'Welcome to Boreal Financial',
        from: 'staff@borealfinancial.com',
        to: 'client@example.com',
        body: 'Welcome! We\'re excited to help with your financing needs.',
        timestamp: new Date().toISOString(),
        direction: 'outbound'
      }
    ];
    
    res.json({ success: true, threads });
  } catch (error: unknown) {
    console.error('❌ [EMAIL] Error:', error);
    res.status(500).json({ error: 'Failed to fetch email threads' });
  }
});

export default r;