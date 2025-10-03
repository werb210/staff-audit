import express from 'express';
import twilio from 'twilio';
import { db } from '../../db';
import { calls } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// SLF and BF phone numbers
const PHONE_NUMBERS = {
  slf: '+17753146801',  // SLF number
  bf: '+18254511768'    // BF number
};

// Initiate outgoing call
router.post('/outgoing', async (req: any, res: any) => {
  const { toNumber, fromSilo, contactId, userId } = req.body;
  
  if (!toNumber || !fromSilo || !userId) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Missing required fields: toNumber, fromSilo, userId' 
    });
  }
  
  const fromNumber = PHONE_NUMBERS[fromSilo as keyof typeof PHONE_NUMBERS];
  if (!fromNumber) {
    return res.status(400).json({ 
      ok: false, 
      error: `Invalid silo: ${fromSilo}. Must be 'slf' or 'bf'` 
    });
  }
  
  console.log(`📞 [VOICE] Initiating outgoing call from ${fromSilo} (${fromNumber}) to ${toNumber}`);
  
  try {
    // Create the call via Twilio
    const call = await twilioClient.calls.create({
      to: toNumber,
      from: fromNumber,
      url: `${process.env.BASE_URL || 'http://localhost:5000'}/api/voice/outgoing-connect`,
      statusCallback: `${process.env.BASE_URL || 'http://localhost:5000'}/api/voice/status-callback`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });
    
    // Log the outgoing call
    await db.insert(calls).values({
      providerCallSid: call.sid,
      direction: 'out',
      status: 'initiated',
      meta: { fromNumber, toNumber, contactId, userId, fromSilo }
    });
    
    console.log(`✅ [VOICE] Outgoing call initiated: ${call.sid}`);
    
    res.json({ 
      ok: true, 
      callSid: call.sid,
      from: fromNumber,
      to: toNumber,
      silo: fromSilo
    });
    
  } catch (error: any) {
    console.error('❌ [VOICE] Failed to initiate outgoing call:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to initiate call',
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// TwiML for connecting outgoing calls
router.post('/outgoing-connect', (req: any, res: any) => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // For now, just connect the call directly
  // In production, you might want to add hold music, announcements, etc.
  twiml.say('Connecting your call...');
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle call status updates
router.post('/status-callback', async (req: any, res: any) => {
  const { CallSid, CallStatus, Duration } = req.body;
  
  console.log(`📊 [VOICE] Call status update: ${CallSid} -> ${CallStatus}`);
  
  try {
    const updateData: any = { status: CallStatus };
    
    if (['completed', 'failed', 'busy', 'no-answer'].includes(CallStatus)) {
      updateData.endedAt = new Date();
    }
    
    await db
      .update(calls)
      .set(updateData)
      .where(eq(calls.providerCallSid, CallSid));
      
    // Notify frontend via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('call_status_update', {
        callSid: CallSid,
        status: CallStatus,
        duration: Duration ? parseInt(Duration) : null
      });
    }
    
  } catch (error: unknown) {
    console.error('❌ [VOICE] Failed to update call status:', error);
  }
  
  res.status(200).send('OK');
});

export default router;