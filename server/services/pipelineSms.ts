// SMS service for pipeline stage transitions
export async function smsOnStage(stage: string, data: { contactPhone: string }) {
  // In development, just log the SMS
  console.log(`[SMS ${stage}] Would send SMS to ${data.contactPhone}: Stage updated to ${stage}`);
  
  // In production, this would call Twilio
  // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await twilio.messages.create({
  //   body: `Your application has been updated to: ${stage}`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: data.contactPhone
  // });
}

export async function smsOnFundsDisbursed(data: { contactPhone: string; amount?: number }) {
  const message = `Congratulations! Your funds of $${(data.amount || 0).toLocaleString()} have been disbursed.`;
  console.log(`[SMS FUNDS] Would send SMS to ${data.contactPhone}: ${message}`);
  
  // In production, this would call Twilio
  // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await twilio.messages.create({
  //   body: message,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: data.contactPhone
  // });
}