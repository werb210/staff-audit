import express from 'express';
import twilio from 'twilio';
import { db } from '../../db';
import { contacts, users, calls } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// SLF and BF phone numbers
const PHONE_NUMBERS = {
  slf: '+17753146801',  // SLF number
  bf: '+18254511768'    // BF number
};

// Incoming call webhook handler
router.post('/incoming', async (req: any, res: any) => {
  const To = req.body.To || req.query.To;
  const From = req.body.From || req.query.From;
  const CallSid = req.body.CallSid || req.query.CallSid;
  console.log(`📞 [VOICE] Incoming call from ${From} to ${To}, CallSid: ${CallSid}`);
  
  // Determine silo based on called number
  const silo = To === PHONE_NUMBERS.slf ? 'slf' : 'bf';
  console.log(`🏢 [VOICE] Call routed to silo: ${silo}`);
  
  // Find matching contact
  let contact = null;
  try {
    const [foundContact] = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.phone, From),
        eq(contacts.silo, silo)
      ));
    contact = foundContact;
  } catch (error: unknown) {
    console.log('🔍 [VOICE] No contact found for caller');
  }
  
  // Log the incoming call
  try {
    await db.insert(calls).values({
      providerCallSid: CallSid,
      direction: 'in',
      status: 'ringing',
      meta: { from: From, to: To, silo: silo }
    });
  } catch (error: unknown) {
    console.error('❌ [VOICE] Failed to log call:', error);
  }
  
  // Broadcast incoming call to all active users via WebSocket
  const io = req.app.get('io');
  if (io) {
    io.emit('incoming_call', {
      type: 'INCOMING_CALL',
      from: From,
      to: To,
      silo: silo,
      contactId: contact?.id || null,
      contactName: contact?.name || 'Unknown Caller',
      callSid: CallSid
    });
    console.log(`🔔 [VOICE] Broadcast incoming call to all users`);
  }
  
  const twiml = new VoiceResponse();
  
  // Ring for 25 seconds, then go to voicemail
  const dial = twiml.dial({
    timeout: 25,
    action: `/api/voice/voicemail-redirect?callSid=${CallSid}&silo=${silo}&from=${From}&contactId=${contact?.id || ''}`,
    method: 'POST'
  });
  
  // Ring all available users (simplified - could be enhanced with user availability)
  dial.number('+15551234567'); // Placeholder - should ring actual user numbers
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle call answer
router.post('/answer', async (req: any, res: any) => {
  const { CallSid, userId } = req.body;
  console.log(`✅ [VOICE] Call ${CallSid} answered by user ${userId}`);
  
  // Update call log
  try {
    await db
      .update(calls)
      .set({ 
        status: 'answered',
        endedAt: new Date()
      })
      .where(eq(calls.providerCallSid, CallSid));
  } catch (error: unknown) {
    console.error('❌ [VOICE] Failed to update call log:', error);
  }
  
  // Notify other users that call was answered
  const io = req.app.get('io');
  if (io) {
    io.emit('call_answered', { callSid: CallSid, answeredBy: userId });
  }
  
  res.json({ ok: true });
});

// Handle call decline
router.post('/decline', async (req: any, res: any) => {
  const { CallSid, userId } = req.body;
  console.log(`❌ [VOICE] Call ${CallSid} declined by user ${userId}`);
  
  // Update call log
  try {
    await db
      .update(calls)
      .set({ 
        status: 'declined',
        endedAt: new Date()
      })
      .where(eq(calls.providerCallSid, CallSid));
  } catch (error: unknown) {
    console.error('❌ [VOICE] Failed to update call log:', error);
  }
  
  const twiml = new VoiceResponse();
  twiml.hangup();
  
  res.type('text/xml');
  res.send(twiml.toString());
});

export default router;