import twilio from 'twilio';
const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

export async function sendOtpSms(toE164: string, code: string) {
  const body = `Boreal: Your login code is ${code}. Expires in 10 min. Reply STOP to opt out.`;
  
  console.log('📱 [SMS-OTP] Sending to:', toE164);
  
  const messageParams: any = {
    to: toE164,
    body,
    statusCallback: `${process.env.PUBLIC_BASE_URL}/api/webhooks/twilio/sms-status`
  };

  // Use Messaging Service if configured, otherwise fallback to from number
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    messageParams.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    console.log('📞 [SMS-OTP] Using Messaging Service:', process.env.TWILIO_MESSAGING_SERVICE_SID);
  } else if (process.env.TWILIO_PHONE_NUMBER) {
    messageParams.from = process.env.TWILIO_PHONE_NUMBER;
    console.log('📞 [SMS-OTP] Using from number:', process.env.TWILIO_PHONE_NUMBER);
  } else {
    throw new Error('Either TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER must be configured');
  }

  const msg = await client.messages.create(messageParams);
  
  console.log('✅ [SMS-OTP] Message created:', { sid: msg.sid, status: msg.status });
  return { sid: msg.sid, status: msg.status };
}