import { Router } from "express";
import fetch from "node-fetch";
import { db } from "../db/drizzle.js";
const r = Router();
r.get("/voice/recording/:callId/audio", async (req, res) => {
    const call = await db.call.findUnique({ where: { id: req.params.callId } });
    if (!call?.recordingUrl)
        return res.status(404).send("not found");
    const twRes = await fetch(call.recordingUrl, {
        headers: {
            "Authorization": "Basic " + Buffer.from(process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN).toString("base64")
        }
    });
    if (!twRes.ok)
        return res.status(502).send("twilio_fetch_failed");
    res.setHeader("Content-Type", twRes.headers.get("content-type") || "audio/mpeg");
    twRes.body?.pipe(res);
});
export default r;
