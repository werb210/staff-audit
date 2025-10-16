export const COMMS_CONSTANTS = {
  CALL_FROM: process.env.TWILIO_CALL_FROM || '+17753146801', // SLF calls
  SMS_FROM: process.env.TWILIO_SMS_FROM || '+18254511768',   // BF SMS
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || '',
};