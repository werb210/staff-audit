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
  
  const normalized = raw.trim();

  if (!normalized) {
    throw new Error('Invalid phone number');
  }

  const digitsOnly = normalized.replace(/[^0-9+]/g, '');

  if (digitsOnly.startsWith('+')) {
    if (/^\+1\d{10}$/.test(digitsOnly)) {
      return digitsOnly;
    }
    throw new Error('Invalid phone number');
  }

  const digits = digitsOnly.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  throw new Error('Invalid phone number');
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