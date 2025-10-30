import { Router } from 'express';
import { db } from '../db';
import { calls, callRecordings, callTranscripts } from '../../shared/schema';
import { eq } from 'drizzle-orm';
const router = Router();
// Recording status webhook (for both 1:1 and conference recordings)
router.post('/voice/recording-status', async (req, res) => {
    console.log('[RECORDING] Voice recording status:', req.body);
    const { RecordingSid, RecordingUrl, CallSid, ConferenceSid, RecordingDuration, RecordingStatus } = req.body;
    if (RecordingStatus === 'completed') {
        try {
            // Find or create call record
            let callId;
            const providerSid = ConferenceSid || CallSid;
            const isConference = !!ConferenceSid;
            const existingCall = await db.select().from(calls).where(eq(calls.providerCallSid, providerSid)).limit(1);
            if (existingCall.length === 0) {
                // Create new call record
                const [newCall] = await db.insert(calls).values({
                    providerCallSid: providerSid,
                    isConference,
                    conferenceSid: ConferenceSid || null,
                    direction: 'in', // Most recordings will be inbound
                    status: 'completed'
                }).returning();
                callId = newCall.id;
            }
            else {
                callId = existingCall[0].id;
            }
            // Store recording
            await db.insert(callRecordings).values({
                callId,
                providerRecordingSid: RecordingSid,
                providerUri: RecordingUrl,
                durationSec: parseInt(RecordingDuration) || 0,
                audioFormat: 'mp3'
            });
            console.log('✅ [RECORDING] Stored recording for call:', callId);
        }
        catch (error) {
            console.error('❌ [RECORDING] Error storing recording:', error);
        }
    }
    res.sendStatus(200);
});
// Conference recording status webhook
router.post('/conference/recording-status', async (req, res) => {
    console.log('[RECORDING] Conference recording status:', req.body);
    const { RecordingSid, RecordingUrl, ConferenceSid, RecordingDuration, RecordingStatus } = req.body;
    if (RecordingStatus === 'completed') {
        try {
            // Find or create conference call record
            let callId;
            const existingCall = await db.select().from(calls).where(eq(calls.conferenceSid, ConferenceSid)).limit(1);
            if (existingCall.length === 0) {
                // Create new conference call record
                const [newCall] = await db.insert(calls).values({
                    providerCallSid: ConferenceSid,
                    isConference: true,
                    conferenceSid: ConferenceSid,
                    direction: 'in',
                    status: 'completed'
                }).returning();
                callId = newCall.id;
            }
            else {
                callId = existingCall[0].id;
            }
            // Store recording
            await db.insert(callRecordings).values({
                callId,
                providerRecordingSid: RecordingSid,
                providerUri: RecordingUrl,
                durationSec: parseInt(RecordingDuration) || 0,
                audioFormat: 'mp3'
            });
            // Queue for transcription
            await db.insert(callTranscripts).values({
                recordingId: (await db.select().from(callRecordings).where(eq(callRecordings.providerRecordingSid, RecordingSid)).limit(1))[0].id,
                status: 'queued'
            });
            console.log('✅ [RECORDING] Stored conference recording and queued transcription for call:', callId);
        }
        catch (error) {
            console.error('❌ [RECORDING] Error storing conference recording:', error);
        }
    }
    res.sendStatus(200);
});
export default router;
