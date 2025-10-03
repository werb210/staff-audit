import { Router } from "express";
import fetch from "node-fetch";
import { requireAuth } from "../auth/verifyOnly";
import { getToken } from "../services/graph";
const r = Router(); r.use(requireAuth);
// Create a Teams meeting with a single attendee
r.post("/o365/meeting", async (req:any,res)=>{
  const { attendee, title="Meeting", date, start, duration=30, tz="UTC" } = req.body||{};
  if(!attendee||!date||!start) return res.status(400).json({ ok:false, error:"missing_fields" });
  const token = await getToken(req.user.sub);
  const startIso = new Date(`${date}T${start}:00Z`).toISOString();
  const endIso = new Date(new Date(startIso).getTime()+duration*60000).toISOString();
  const rsp = await fetch("https://graph.microsoft.com/v1.0/me/events",{
    method:"POST",
    headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      subject:title,
      start:{ dateTime:startIso, timeZone: tz }, end:{ dateTime:endIso, timeZone: tz },
      attendees:[{ emailAddress:{ address: attendee }, type:"required"}],
      isOnlineMeeting:true, onlineMeetingProvider:"teamsForBusiness"
    })
  });
  const j = await rsp.json();
  if(!rsp.ok) return res.status(400).json({ ok:false, error:j });
  res.json({ ok:true, joinUrl: j?.onlineMeeting?.joinUrl||j?.onlineMeetingUrl||null, eventId: j?.id });
});
export default r;