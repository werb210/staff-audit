import { Router } from "express";
import { db } from "../db/drizzle.js";
import { logActivity } from "../lib/activities.js";
import fetch from "node-fetch";
import FormData from "form-data";

const r = Router();

// Securely fetch Twilio media
async function fetchTwilioMedia(url: string) {
  const res = await fetch(url, {
    headers: { 
      "Authorization": "Basic " + Buffer.from(
        process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN
      ).toString("base64") 
    }
  });
  if (!res.ok) throw new Error("twilio_media_fetch_failed");
  return Buffer.from(await res.arrayBuffer());
}

// OpenAI transcription
async function transcribeAudioMp3(buf: Buffer) {
  const form = new FormData();
  form.append("file", buf, { filename: "call.mp3", contentType: "audio/mpeg" });
  form.append("model", "whisper-1");
  
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      ...form.getHeaders()
    },
    body: form
  });
  
  const j: any = await res.json();
  if (!res.ok) throw new Error("openai_transcribe_failed: " + JSON.stringify(j));
  return j.text as string;
}

async function summarize(text: string) {
  const prompt = `Summarize the call in 6 bullets: context, need, objections, docs requested, next steps, outcome. 
Classify disposition: one of [qualified, callback, docs_requested, not_a_fit, wrong_number].
Return a JSON object {summary, disposition, nextActions:[{title,dueDays}], tags:[…]}.`;
  
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      model: "gpt-4o-mini", 
      response_format: { type: "json_object" }, 
      messages: [
        { role: "user", content: prompt },
        { role: "user", content: text.slice(0, 12000) } // safety cap
      ]
    })
  });
  
  const j: any = await res.json();
  if (!res.ok) throw new Error("openai_summary_failed: " + JSON.stringify(j));
  return JSON.parse(j.choices?.[0]?.message?.content || "{}");
}

r.post("/voice/transcribe", async (req: any, res: any) => {
  try {
    const { callSid } = req.body || {};
    const call = await db.call.findFirst({ where: { twilioCallSid: callSid } });
    if (!call?.recordingUrl) {
      return res.status(404).json({ ok: false, error: "call_or_recording_not_found" });
    }

    // 1) get media from Twilio
    const buf = await fetchTwilioMedia(call.recordingUrl);

    // 2) transcribe
    const transcript = await transcribeAudioMp3(buf);

    // 3) summarize + classify
    const { summary, disposition, nextActions, tags } = await summarize(transcript);

    // 4) persist & activity
    await db.callSummary.create({
      data: { 
        callId: call.id, 
        transcript, 
        summary, 
        disposition, 
        nextActions, 
        tags 
      }
    });

    await logActivity({
      type: "call_summary",
      contactId: call.contactId ?? undefined,
      applicationId: call.applicationId ?? undefined,
      tags: ["voice", "summary", ...(tags || [])],
      meta: { callId: call.id, disposition, nextActions }
    });

    // 5) OPTIONAL task creation (internal only; NEVER outreach)
    // nextActions?.forEach(async (a:any) => { await db.task.create({ ... }) });

    res.json({ ok: true, transcript, summary, disposition });
  } catch (e: any) {
    console.error("Transcription error:", e);
    res.status(500).json({ ok: false, error: "transcription_failed", detail: String(e.message || e) });
  }
});

export default r;