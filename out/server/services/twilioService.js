import twilio from "twilio";
import { TELEPHONY } from "../config/telephony";
// BF-only token generator
export function generateVoiceToken(identity) {
    const config = TELEPHONY.BF;
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    const token = new AccessToken(config.accountSid, config.apiKeySid, config.apiKeySecret, { identity });
    token.addGrant(new VoiceGrant({
        outgoingApplicationSid: config.twimlAppSid,
        incomingAllow: true,
    }));
    return token.toJwt();
}
export function getTwilioClient() {
    const config = TELEPHONY.BF;
    return twilio(config.apiKeySid, config.apiKeySecret, { accountSid: config.accountSid });
}
