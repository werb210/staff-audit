import express from 'express';
import twilio from 'twilio';
import { db } from '../../db';
import { calls, contacts } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Voicemail redirect (when call isn't answered)
router.post('/voicemail-redirect', async (req: any, res: any) => {
  const { callSid, silo, from, contactId } = req.query;
  
  console.log(`📧 [VOICEMAIL] Redirecting to voicemail: ${callSid} from ${from} (${silo})`);
  
  // Update call log to missed
  try {
    await db
      .update(calls)
      .set({ 
        status: 'missed',
        endedAt: new Date()
      })
      .where(eq(calls.providerCallSid, callSid as string));
  } catch (error: unknown) {
    console.error('❌ [VOICEMAIL] Failed to update call log:', error);
  }
  
  const twiml = new VoiceResponse();
  
  // Voicemail greeting
  const siloName = silo === 'slf' ? 'Site Level Financial' : 'Boreal Financial';
  twiml.say(`Thank you for calling ${siloName}. We're unable to take your call right now. Please leave a message after the tone and we'll get back to you as soon as possible.`);
  
  // Record the voicemail
  twiml.record({
    maxLength: 120, // 2 minutes max
    transcribe: true,
    transcribeCallback: `/api/voice/voicemail-notify?callSid=${callSid}&silo=${silo}&from=${from}&contactId=${contactId || ''}`,
    recordingStatusCallback: `/api/voice/recording-status?callSid=${callSid}&silo=${silo}&from=${from}&contactId=${contactId || ''}`,
    playBeep: true,
    timeout: 10,
    finishOnKey: '#'
  });
  
  twiml.say('Thank you for your message. Goodbye.');
  twiml.hangup();
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle voicemail transcription callback
router.post('/voicemail-notify', async (req: any, res: any) => {
  const { TranscriptionText, RecordingUrl, RecordingSid, TranscriptionSid } = req.body;
  const { callSid, silo, from, contactId } = req.query;
  
  console.log(`📝 [VOICEMAIL] Transcription received for ${callSid}: ${TranscriptionText}`);
  
  try {
    // Save voicemail to database
    const [voicemail] = await db.insert(voicemails).values({
      callSid: callSid as string,
      from: from as string,
      silo: silo as string,
      contactId: (contactId as string) || null,
      recordingUrl: RecordingUrl,
      recordingSid: RecordingSid,
      transcriptionText: TranscriptionText || 'Transcription not available',
      transcriptionSid: TranscriptionSid,
      isRead: false,
      createdAt: new Date().toISOString()
    }).returning();
    
    // Add to contact timeline if contact exists
    if (contactId) {
      try {
        const [contact] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, contactId as string));
          
        if (contact) {
          // Add timeline entry (this would be part of a timeline/notes system)
          console.log(`📋 [VOICEMAIL] Added voicemail to contact ${contact.name} timeline`);
        }
      } catch (error: unknown) {
        console.log('⚠️ [VOICEMAIL] Could not update contact timeline:', error);
      }
    }
    
    // Notify frontend via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_voicemail', {
        type: 'NEW_VOICEMAIL',
        voicemail: voicemail,
        silo: silo,
        from: from,
        contactId: contactId || null,
        transcript: TranscriptionText
      });
    }
    
    console.log(`✅ [VOICEMAIL] Voicemail saved and notifications sent`);
    
  } catch (error: unknown) {
    console.error('❌ [VOICEMAIL] Failed to save voicemail:', error);
  }
  
  res.status(200).send('OK');
});

// Handle recording status updates
router.post('/recording-status', async (req: any, res: any) => {
  const { RecordingStatus, RecordingUrl, RecordingSid } = req.body;
  const { callSid } = req.query;
  
  console.log(`🎙️ [VOICEMAIL] Recording status for ${callSid}: ${RecordingStatus}`);
  
  if (RecordingStatus === 'completed' && RecordingUrl) {
    try {
      // Update voicemail with final recording URL if not already set
      await db
        .update(voicemails)
        .set({ 
          recordingUrl: RecordingUrl,
          recordingSid: RecordingSid
        })
        .where(eq(voicemails.callSid, callSid as string));
    } catch (error: unknown) {
      console.error('❌ [VOICEMAIL] Failed to update recording URL:', error);
    }
  }
  
  res.status(200).send('OK');
});

// Get voicemails for a user/silo
router.get('/voicemails', async (req: any, res: any) => {
  const { silo, userId, unreadOnly } = req.query;
  
  try {
    let query = db.select().from(voicemails);
    
    if (silo) {
      query = query.where(eq(voicemails.silo, silo as string));
    }
    
    if (unreadOnly === 'true') {
      query = query.where(eq(voicemails.isRead, false));
    }
    
    const results = await query.orderBy(voicemails.createdAt);
    
    res.json({
      ok: true,
      voicemails: results,
      count: results.length
    });
    
  } catch (error: unknown) {
    console.error('❌ [VOICEMAIL] Failed to fetch voicemails:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch voicemails' });
  }
});

// Mark voicemail as read
router.post('/voicemails/:id/read', async (req: any, res: any) => {
  const { id } = req.params;
  
  try {
    await db
      .update(voicemails)
      .set({ 
        isRead: true,
        readAt: new Date().toISOString()
      })
      .where(eq(voicemails.id, id));
      
    res.json({ ok: true });
  } catch (error: unknown) {
    console.error('❌ [VOICEMAIL] Failed to mark as read:', error);
    res.status(500).json({ ok: false, error: 'Failed to mark as read' });
  }
});

// Delete voicemail
router.delete('/voicemails/:id', async (req: any, res: any) => {
  const { id } = req.params;
  
  try {
    await db
      .delete(voicemails)
      .where(eq(voicemails.id, id));
      
    res.json({ ok: true });
  } catch (error: unknown) {
    console.error('❌ [VOICEMAIL] Failed to delete voicemail:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete voicemail' });
  }
});

export default router;