// server/src/services/twilio.ts
import Twilio from 'twilio';
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
if (!accountSid || !authToken) {
    throw new Error('Twilio account SID and auth token must be set in environment variables.');
}
const client = Twilio(accountSid, authToken);
/**
 * Send an SMS message via Twilio.
 * @param to The recipient phone number in E.164 format.
 * @param body The message body.
 */
export async function sendSms(to, body) {
    await client.messages.create({
        body,
        to,
        messagingServiceSid: serviceSid,
    });
}
/**
 * Start a call via Twilio.
 * @param to The recipient phone number.
 * @param from The Twilio caller ID number.
 * @param twimlUrl URL of the TwiML instructions for the call.
 */
export async function startCall(to, from, twimlUrl) {
    await client.calls.create({
        to,
        from,
        url: twimlUrl,
    });
}
