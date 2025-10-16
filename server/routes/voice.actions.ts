import { Router } from "express";
import twilio from "twilio";

const r = Router();
const sid = process.env.TWILIO_ACCOUNT_SID!;
const tok = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(sid, tok);

/** Toggle call recording (server-side, not local mic) */
r.post("/api/voice/record", async (req: any, res: any) => {
  try {
    const { callSid, action } = req.body as { callSid: string; action: "start"|"stop" };
    if (!process.env.VOICE_ALLOW_RECORDING) return res.status(403).json({ error: "recording_disabled" });
    const rec = await client.calls(callSid).recordings.create({ recordingTrack: "both" });
    if (action === "stop") await client.calls(callSid).recordings(rec.sid).update({ status: "stopped" });
    res.json({ ok: true, sid: rec.sid });
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

/** Add a participant by creating/using a conference (enables hold/merge semantics) */
r.post("/api/voice/add-participant", async (req: any, res: any) => {
  try {
    const { conferenceName, phoneNumber } = req.body as { conferenceName: string; phoneNumber: string };
    const part = await client.conferences(conferenceName).participants.create({
      from: process.env.OUTBOUND_CALLER_ID!,
      to: phoneNumber,
      earlyMedia: true,
      endConferenceOnExit: false
    });
    res.json({ ok: true, participantSid: part.callSid });
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

/** Hold / resume a participant in a conference */
r.post("/api/voice/hold", async (req: any, res: any) => {
  try {
    const { conferenceName, participantSid, hold } = req.body as { conferenceName: string; participantSid: string; hold: boolean };
    const part = await client.conferences(conferenceName).participants(participantSid).update({ hold });
    res.json({ ok: true, hold: part.hold });
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

/** Transfer the call by redirecting the leg to a new TwiML */
r.post("/api/voice/transfer", async (req: any, res: any) => {
  try {
    const { callSid, to } = req.body as { callSid: string; to: string };
    await client.calls(callSid).update({
      url: `https://handler.twilio.com/twiml/${process.env.TWILIO_TWIML_APP_SID}?to=${encodeURIComponent(to)}`
    });
    res.json({ ok: true });
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

/** DTMF keypad passthrough */
r.post("/api/voice/digits", async (req: any, res: any) => {
  try {
    const { callSid, digits } = req.body as { callSid: string; digits: string };
    await client.calls(callSid).update({ sendDigits: digits });
    res.json({ ok: true });
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

/** Merge all participants in a conference */
r.post("/api/voice/merge", async (req: any, res: any) => {
  try {
    const { conferenceName } = req.body;
    if (!conferenceName) return res.status(400).json({ error: "missing_conference_name" });

    // Get all participants in the conference
    const participants = await client.conferences(conferenceName).participants.list();
    
    // Ensure all participants are unholded and connected to main conference
    for (const participant of participants) {
      if (participant.hold) {
        await client.conferences(conferenceName)
          .participants(participant.sid)
          .update({ hold: false });
      }
    }

    res.json({ ok: true, merged: participants.length });
  } catch (e: any) {
    console.error("[VOICE] merge error", e);
    res.status(500).json({ error: "merge_failed", message: e?.message });
  }
});

export default r;