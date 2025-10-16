/**
 * Twilio SMS Routes - Features 1 & 2
 * Feature 1: Transactional SMS - GET /api/twilio/sms/send
 * Feature 2: Two-way SMS - POST /api/twilio/sms/incoming
 */

import { Router } from 'express';
import twilio from 'twilio';

const router = Router();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Feature 1: Transactional SMS - Send outbound SMS
router.get('/send', async (req: any, res: any) => {
  try {
    const { to, message } = req.query;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: to, message'
      });
    }

    const result = await twilioClient.messages.create({
      body: message as string,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to as string
    });

    // Log the SMS send event
    console.log('📤 SMS Sent:', {
      sid: result.sid,
      to: result.to,
      status: result.status,
      message: message
    });

    res.json({
      success: true,
      message: 'SMS sent successfully',
      data: {
        sid: result.sid,
        status: result.status,
        to: result.to
      }
    });

  } catch (error: unknown) {
    console.error('❌ SMS Send Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Feature 2: Two-way SMS - Handle incoming SMS webhook
router.post('/incoming', async (req: any, res: any) => {
  try {
    const { MessageSid, From, To, Body } = req.body;
    
    // Log the incoming message
    console.log('📥 Incoming SMS:', {
      sid: MessageSid,
      from: From,
      to: To,
      body: Body
    });

    // Auto-reply logic for two-way SMS
    let autoReply = '';
    const bodyLower = Body?.toLowerCase() || '';
    
    if (bodyLower.includes('help')) {
      autoReply = 'Thank you for contacting us. For immediate assistance, please call us at (555) 123-4567.';
    } else if (bodyLower.includes('status')) {
      autoReply = 'We have received your inquiry and will respond within 24 hours.';
    } else if (bodyLower.includes('stop') || bodyLower.includes('unsubscribe')) {
      autoReply = 'You have been unsubscribed from SMS notifications.';
    } else {
      autoReply = 'Thank you for your message. We will get back to you soon.';
    }

    // Send auto-reply (only if different numbers to avoid Twilio error)
    if (autoReply && From !== To) {
      await twilioClient.messages.create({
        body: autoReply,
        from: To, // Reply from the number they texted
        to: From  // Reply to the sender
      });
    }

    // Respond with TwiML (required by Twilio)
    const twiml = new twilio.twiml.MessagingResponse();
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error: unknown) {
    console.error('❌ Incoming SMS Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process incoming SMS',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;