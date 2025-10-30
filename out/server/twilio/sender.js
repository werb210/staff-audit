import twilio from "twilio";
const sid = process.env.TWILIO_ACCOUNT_SID || 'ACmock000000000000000000000000000';
const tok = process.env.TWILIO_AUTH_TOKEN || 'mock_auth_token';
const from = process.env.TWILIO_FROM_NUMBER || '+15555550123';
// Only initialize Twilio if we have valid credentials
const client = (sid.startsWith('AC') && tok !== 'mock_auth_token')
    ? twilio(sid, tok)
    : null;
export async function sendSms(to, body) {
    if (!client) {
        console.log('[TWILIO] Mock SMS send:', { to, body, from });
        return { sid: 'mock_' + Date.now(), status: 'delivered' };
    }
    return client.messages.create({ to, from, body });
}
