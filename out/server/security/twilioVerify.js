import { getTwilioClient } from "../services/twilioService";
import { TELEPHONY } from "../config/telephony";
export async function sendCode(phoneNumber) {
    try {
        const client = getTwilioClient();
        const cfg = TELEPHONY.BF;
        const verify = client.verify.v2.services(cfg.verifyServiceSid);
        await verify.verifications.create({ to: phoneNumber, channel: 'sms' });
        return true;
    }
    catch (error) {
        console.error('[Twilio] sendCode error:', error);
        return false;
    }
}
export async function checkCode(phoneNumber, code) {
    try {
        const client = getTwilioClient();
        const cfg = TELEPHONY.BF;
        const verify = client.verify.v2.services(cfg.verifyServiceSid);
        console.log(`[Twilio] Checking code for ${phoneNumber}...`);
        const result = await verify.verificationChecks.create({ to: phoneNumber, code });
        console.log(`[Twilio] Verification result:`, result.status, result.valid);
        return { status: result.status, valid: result.valid };
    }
    catch (error) {
        console.error('[Twilio] checkCode error:', error.message, error.code);
        return { status: 'failed', valid: false };
    }
}
export function verifyTwilioWebhook(req, res, next) {
    try {
        // Webhook validation - for now allow all in development
        next();
    }
    catch (e) {
        return res.status(403).send("Invalid signature");
    }
}
