/**
 * Voice Outgoing Calls API
 * Public endpoint for making outbound calls without authentication
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Public outgoing call endpoint
router.post('/outgoing', async (req: Request, res: Response) => {
  console.log('📞 [VOICE-OUTGOING] Call request received:', req.body);
  
  const { to, contactId, contactName } = req.body;
  
  if (!to) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Phone number is required' 
    });
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
  const twilioReady = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);

  if (!twilioReady) {
    console.log('🧪 [VOICE-OUTGOING] Test mode - simulating call');
    return res.json({ 
      ok: true, 
      sid: `SIM-${Date.now()}`,
      to, 
      from: '+1-555-BF-CALL',
      status: 'simulated',
      message: 'Call simulated - Twilio not configured'
    });
  }

  try {
    const twilio = (await import('twilio')).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    const callData = {
      to: to,
      from: TWILIO_PHONE_NUMBER,
      twiml: `<Response>
        <Say voice="Polly.Joanna">
          Hello, this is a call from Boreal Financial regarding ${contactName ? `your application, ${contactName}` : 'your application'}. 
          Please hold while we connect you to one of our agents.
        </Say>
        <Dial timeout="30" callerId="${TWILIO_PHONE_NUMBER}">
          <Client>agent</Client>
        </Dial>
        <Say voice="Polly.Joanna">
          We're sorry, all agents are currently busy. Please call us back or we'll try to reach you again soon.
        </Say>
      </Response>`,
      machineDetection: 'DetectMessageEnd',
      statusCallback: `${process.env.APP_URL || 'https://your-domain.replit.app'}/api/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    };

    console.log(`📞 [VOICE-OUTGOING] Initiating call: ${TWILIO_PHONE_NUMBER} -> ${to}`);
    
    const call = await client.calls.create(callData);
    
    console.log(`✅ [VOICE-OUTGOING] Call created: ${call.sid}`);
    
    // Log the call activity
    if (contactId) {
      console.log(`📝 [VOICE-OUTGOING] Logging call for contact: ${contactId}`);
    }
    
    return res.json({
      ok: true,
      sid: call.sid,
      to,
      from: TWILIO_PHONE_NUMBER,
      status: 'initiated',
      message: 'Call initiated successfully'
    });
    
  } catch (error: any) {
    console.error('❌ [VOICE-OUTGOING] Call failed:', error);
    
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error) || 'Failed to initiate call',
      details: error
    });
  }
});

// Call status webhook
router.post('/status', (req: Request, res: Response) => {
  console.log('📊 [VOICE-STATUS] Call status update:', req.body);
  
  const { CallSid, CallStatus, From, To } = req.body;
  
  // Log call status changes
  console.log(`📞 [VOICE-STATUS] Call ${CallSid}: ${From} -> ${To} status: ${CallStatus}`);
  
  res.status(200).send('OK');
});

export default router;