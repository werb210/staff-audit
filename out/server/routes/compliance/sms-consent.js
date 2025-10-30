import { Router } from "express";
import { requireAuth } from "../../auth/verifyOnly";
import { db } from "../../db/drizzle";
import { contacts, smsConsent } from "../../db/schema";
import { eq, sql } from "drizzle-orm";
const r = Router();
r.use(requireAuth);
// Record SMS consent
r.post("/record", async (req, res) => {
    try {
        const { contactId, phoneNumber, consentType, ipAddress, userAgent } = req.body;
        // Types: 'opt_in', 'opt_out', 'stop', 'start'
        const validTypes = ['opt_in', 'opt_out', 'stop', 'start'];
        if (!validTypes.includes(consentType)) {
            return res.status(400).json({ ok: false, error: "Invalid consent type" });
        }
        await db.insert(smsConsent).values({
            contactId: contactId || null,
            phoneNumber,
            consentType,
            ipAddress,
            userAgent,
            timestamp: new Date(),
            source: 'web_form'
        });
        // Update contact's SMS consent status if we have a contactId
        if (contactId) {
            const canReceiveSms = ['opt_in', 'start'].includes(consentType);
            await db.execute(sql `
        UPDATE contacts 
        SET sms_consent = ${canReceiveSms},
            sms_consent_date = NOW()
        WHERE id = ${contactId}
      `);
        }
        res.json({ ok: true, message: "Consent recorded" });
    }
    catch (error) {
        console.error('SMS consent error:', error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Check consent status for a phone number
r.get("/status/:phoneNumber", async (req, res) => {
    try {
        const phoneNumber = req.params.phoneNumber;
        // Get latest consent record for this number
        const { rows } = await db.execute(sql `
      SELECT consent_type, timestamp
      FROM sms_consent
      WHERE phone_number = ${phoneNumber}
      ORDER BY timestamp DESC
      LIMIT 1
    `);
        if (rows.length === 0) {
            return res.json({
                ok: true,
                hasConsent: false,
                status: 'unknown',
                message: 'No consent record found'
            });
        }
        const latest = rows[0];
        const hasConsent = ['opt_in', 'start'].includes(latest.consent_type);
        res.json({
            ok: true,
            hasConsent,
            status: latest.consent_type,
            lastUpdate: latest.timestamp
        });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Handle STOP/START keywords (called by Twilio webhook)
r.post("/keyword", async (req, res) => {
    try {
        const from = req.body.From;
        const body = (req.body.Body || '').toLowerCase().trim();
        let consentType = null;
        let responseMessage = null;
        switch (body) {
            case 'stop':
            case 'stopall':
            case 'unsubscribe':
            case 'cancel':
            case 'end':
            case 'quit':
                consentType = 'stop';
                responseMessage = 'You have been unsubscribed from SMS messages. Reply START to re-subscribe.';
                break;
            case 'start':
            case 'yes':
            case 'subscribe':
                consentType = 'start';
                responseMessage = 'You have been subscribed to SMS messages. Reply STOP to unsubscribe.';
                break;
            case 'help':
            case 'info':
                responseMessage = 'Reply STOP to unsubscribe or START to subscribe to SMS messages.';
                break;
        }
        if (consentType) {
            // Record consent
            await db.insert(smsConsent).values({
                phoneNumber: from,
                consentType,
                timestamp: new Date(),
                source: 'sms_keyword'
            });
            // Update contact if exists
            await db.execute(sql `
        UPDATE contacts 
        SET sms_consent = ${consentType === 'start'},
            sms_consent_date = NOW()
        WHERE phone = ${from}
      `);
        }
        if (responseMessage) {
            // Return TwiML response
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>${responseMessage}</Message>
        </Response>`;
            res.type('text/xml').send(twiml);
        }
        else {
            // No keyword match, don't respond
            res.status(200).end();
        }
    }
    catch (error) {
        console.error('SMS keyword handling error:', error);
        res.status(500).end();
    }
});
// Check quiet hours (compliance feature)
r.get("/quiet-hours/:contactId", async (req, res) => {
    try {
        const contactId = req.params.contactId;
        // Get contact's timezone preference
        const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId));
        if (!contact) {
            return res.status(404).json({ ok: false, error: "Contact not found" });
        }
        // Default quiet hours: 9 PM to 8 AM in contact's timezone
        const timezone = contact.timezone || 'America/New_York';
        const now = new Date();
        const localTime = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            hour12: false
        }).format(now);
        const hour = parseInt(localTime);
        const isQuietHours = hour >= 21 || hour < 8; // 9 PM to 8 AM
        res.json({
            ok: true,
            isQuietHours,
            localTime: localTime,
            timezone,
            message: isQuietHours ? 'Currently in quiet hours' : 'Safe to send messages'
        });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
export default r;
