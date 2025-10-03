import { Router, Request, Response } from "express";
import twilio from "twilio";
const router = Router();

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN || "";
const VOICE_FROM  = process.env.TWILIO_SLF_NUMBER || "+17753146801";
const client = (ACCOUNT_SID && AUTH_TOKEN) ? twilio(ACCOUNT_SID, AUTH_TOKEN) : null;

/**
 * POST /api/voice/actions/transfer
 * Body: { callSid: string, to: string }   // transfer active call to another PSTN
 */
router.post("/transfer", async (req: Request, res: Response) => {
  try {
    const { callSid, to } = req.body || {};
    if (!callSid || !to) return res.status(400).json({ error: "missing_fields" });
    if (!client) return res.json({ ok: true, provider: "stub" });

    await client.calls(callSid).update({
      method: "POST",
      url: `${process.env.PUBLIC_BASE_URL?.replace(/\/$/,"")}/api/voice/twiml/transfer?to=${encodeURIComponent(to)}`
    });
    res.json({ ok: true });
  } catch (e:any) {
    console.error("[VOICE] transfer error", e);
    res.status(500).json({ error: "transfer_failed", message: e?.message });
  }
});

/**
 * POST /api/voice/actions/conference
 * Body: { callSid: string, room: string } // move both legs to a conference
 */
router.post("/conference", async (req: any, res: any) => {
  try {
    const { callSid, room } = req.body || {};
    const conf = room || `conf-${Date.now()}`;
    if (!callSid) return res.status(400).json({ error: "missing_fields" });
    if (!client) return res.json({ ok: true, provider: "stub", room: conf });

    await client.calls(callSid).update({
      method: "POST",
      url: `${process.env.PUBLIC_BASE_URL?.replace(/\/$/,"")}/api/voice/twiml/conference?room=${encodeURIComponent(conf)}`
    });
    res.json({ ok: true, room: conf });
  } catch (e:any) {
    console.error("[VOICE] conference error", e);
    res.status(500).json({ error: "conference_failed", message: e?.message });
  }
});

/**
 * POST /api/voice/actions/recording
 * Body: { callSid: string, action: "start"|"stop" }
 */
router.post("/recording", async (req: any, res: any) => {
  try {
    const { callSid, action } = req.body || {};
    if (!callSid || !action) return res.status(400).json({ error: "missing_fields" });
    if (!client) return res.json({ ok: true, provider: "stub" });

    if (action === "start") {
      const rec = await client.calls(callSid).recordings.create({ recordingChannels: "mono" });
      return res.json({ ok: true, recordingSid: rec.sid });
    }
    if (action === "stop") {
      // Stops all on-going recordings for the call
      const list = await client.calls(callSid).recordings.list({ limit: 20 });
      await Promise.all(list.map(r => client!.recordings(r.sid).fetch()));
      return res.json({ ok: true, stopped: list.map(x=>x.sid) });
    }
    res.status(400).json({ error: "invalid_action" });
  } catch (e:any) {
    console.error("[VOICE] recording error", e);
    res.status(500).json({ error: "recording_failed", message: e?.message });
  }
});

export default router;