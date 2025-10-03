import { Router } from "express";
import twilio from "twilio";
const r = Router();

// Outgoing voice TwiML — dials the requested destination number
r.post("/outgoing", (req,res)=>{
  const vr = new (twilio as any).twiml.VoiceResponse();
  const to = req.body.To;
  const wantRecord = String(req.body.record||"") === "1";
  // record only if the destination has recording consent
  let recordFlag:any = undefined;
  (async ()=>{
    try {
      const { getContactByPhone } = require("../util/phoneLookup");
      const c = await getContactByPhone(to);
      if (wantRecord && c?.callRecordingConsent) recordFlag = "record-from-ringing";
    } catch {}
    if (to) { 
      const d = vr.dial({ callerId: process.env.BF_PHONE_E164, record: recordFlag });
      d.number({}, to);
    } else { vr.say("No destination specified"); }
    res.type("text/xml").send(vr.toString());
  })();
});

export default r;