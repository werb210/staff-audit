import { Router } from "express";
const q = pool.query.bind(pool);
import twilio from "twilio";
import { pool } from "../../db/pool";
import { COMMS_CONSTANTS } from "../../config/comms";
import { logContactActivity } from "../../services/activityLog";
import { publish } from "../../realtime/hub";
const router = Router();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// Outbound call initiation (uses SLF number)
router.post("/start", async (req, res) => {
    const { contactId, toNumber } = req.body || {};
    if (!contactId || !toNumber)
        return res.status(400).json({ error: "Missing fields" });
    try {
        const call = await client.calls.create({
            from: COMMS_CONSTANTS.CALL_FROM,
            to: toNumber,
            url: `${COMMS_CONSTANTS.PUBLIC_BASE_URL}/api/comms/calls/twiml/basic`, // simple <Say> TwiML
        });
        const [row] = await q(`
      INSERT INTO comm_calls (contact_id, direction, status, twilio_sid, from_number, to_number, created_by_user_id)
      VALUES ($1, 'out', 'queued', $2, $3, $4, $5)
      RETURNING id
    `, [contactId, call.sid, COMMS_CONSTANTS.CALL_FROM, toNumber, req.user?.id]);
        // Log activity and publish realtime update
        await logContactActivity({
            contactId,
            type: "call",
            direction: "out",
            title: "Call started",
            body: `Calling ${toNumber} from ${COMMS_CONSTANTS.CALL_FROM}`,
            meta: { sid: call.sid }
        });
        publish(`contact:${contactId}`, { kind: "call", direction: "out", status: "queued", sid: call.sid });
        return res.json({ ok: true, id: row.id, sid: call.sid });
    }
    catch (error) {
        console.error('Call start error:', error);
        return res.status(500).json({ error: 'Failed to start call' });
    }
});
// Basic TwiML
router.post("/twiml/basic", (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("This call is connected. Please proceed.");
    res.type("text/xml").send(twiml.toString());
});
// Status callback
router.post("/status", async (req, res) => {
    const sid = req.body.CallSid;
    const status = req.body.CallStatus;
    try {
        await q(`
      UPDATE comm_calls 
      SET status = $1 
      WHERE twilio_sid = $2
    `, [status, sid]);
        // Log activity update for call status change
        const [call] = await q(`
      SELECT contact_id FROM comm_calls WHERE twilio_sid = $1
    `, [sid]);
        if (call) {
            await logContactActivity({
                contactId: call.contact_id,
                type: "call",
                direction: "out",
                title: `Call ${status}`,
                body: "",
                meta: { sid, status }
            });
            publish(`contact:${call.contact_id}`, { kind: "call", status, sid });
        }
        res.sendStatus(200);
    }
    catch (error) {
        console.error('Call status update error:', error);
        res.sendStatus(500);
    }
});
export default router;
