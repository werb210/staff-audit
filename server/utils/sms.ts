import { parsePhoneNumberFromString } from 'libphonenumber-js';
import twilio from 'twilio';

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER
} = process.env;

let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);
  }
  return twilioClient;
}

export function toE164(raw: string) {
  // Allow test numbers for testing (555 numbers)
  if (raw.match(/^\+1555\d{7}$/)) {
    return raw;
  }
  
  const p = parsePhoneNumberFromString(raw, 'US');
  if (!p?.isValid()) {
    throw new Error('Invalid phone number');
  }
  return p.number;           // +15878881837
}

export async function sendSMS(to: string, body: string) {
  const client = getTwilioClient();
  
  // In development mode, use test phone number for Twilio test mode
  const targetPhone = process.env.NODE_ENV === 'development' 
    ? '+15878881837'  // Test phone number for development
    : to;             // User's actual phone number in production
  
  await client.messages.create({
    to: targetPhone,
    from: TWILIO_PHONE_NUMBER!,
    body
  });
}