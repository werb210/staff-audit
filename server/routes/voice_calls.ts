import { Router } from "express";
import twilio from "twilio";
import fetch from "node-fetch";
import { db } from "../db/drizzle.js";
import { logActivity } from "../lib/activities.js";

const r = Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Inbound: record entire call; Twilio posts RecordingStatusCallback later.
r.post("/twiml/inbound", async (req: any, res: any) => {
  const from = req.body.From as string;
  const to = req.body.To as string;
  const callSid = req.body.CallSid as string;

  // Create Call row (attach contact/application later if we can match by phone)
  const call = await db.call.create({
    data: { direction: "inbound", fromE164: from, toE164: to, twilioCallSid: callSid }
  });

  await logActivity({ 
    type: "call_in", 
    tags: ["voice", "incoming"], 
    meta: { callId: call.id, from, to, callSid } 
  });

  const vr = new VoiceResponse();
  vr.say({ voice: "Polly.Amy" }, "Please hold while we connect you.");
  vr.record({
    recordingStatusCallback: `${process.env.PUBLIC_URL}/api/voice/recording-callback`,
    recordingStatusCallbackEvent: ["completed"],
    playBeep: true
  });
  res.type("text/xml").send(vr.toString());
});

// Outbound bootstrap (optional)
r.post("/twiml/outbound", async (req: any, res: any) => {
  const { to } = req.body || {};
  const vr = new VoiceResponse();
  vr.dial({ 
    callerId: process.env.TWILIO_FROM_E164, 
    record: "record-from-answer-dual",
    recordingStatusCallback: `${process.env.PUBLIC_URL}/api/voice/recording-callback` 
  }, to);
  res.type("text/xml").send(vr.toString());
});

// Twilio RecordingStatusCallback -> store recording URL; trigger transcription
r.post("/recording-callback", async (req: any, res: any) => {
  const callSid = req.body.CallSid as string;
  const duration = Number(req.body.RecordingDuration || 0);
  const recordingUrl = (req.body.RecordingUrl as string) + ".mp3"; // Twilio provides base; add extension

  const call = await db.call.findFirst({ where: { twilioCallSid: callSid } });
  if (call) {
    await db.call.update({
      where: { id: call.id },
      data: { recordingUrl, durationSec: duration, endedAt: new Date() }
    });
    await logActivity({ 
      type: "call_recorded", 
      tags: ["voice", "recording"], 
      meta: { callId: call.id, recordingUrl, duration } 
    });
  }
  
  // Fire and forget transcription
  fetch(`${process.env.PUBLIC_URL}/api/transcription/voice/transcribe`, {
    method: "POST", 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callSid })
  }).catch(() => {});
  
  res.sendStatus(200);
});

// Get calls for a contact or application
r.get("/calls", async (req: any, res: any) => {
  const { contactId, applicationId, tenant = "bf" } = req.query;
  const where: any = { tenant };
  
  if (contactId) where.contactId = String(contactId);
  if (applicationId) where.applicationId = String(applicationId);
  
  const calls = await db.call.findMany({
    where,
    include: { summary: true },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  
  res.json({ ok: true, calls });
});

// Activities endpoint for contact/application activity streams
r.get("/activities", async (req: any, res: any) => {
  const { contactId, applicationId, tenant = "bf", limit = 50 } = req.query;
  const where: any = { tenant };
  
  if (contactId) where.contactId = String(contactId);
  if (applicationId) where.applicationId = String(applicationId);
  
  const activities = await db.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Number(limit)
  });
  
  res.json({ ok: true, activities });
});

export default r;