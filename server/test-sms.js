/**
 * Test script to send real SMS via Twilio to Andrew's phone
 */

import twilio from 'twilio';
import { config } from 'dotenv';
config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

console.log('Twilio Configuration Check:');
console.log('TWILIO_ACCOUNT_SID:', accountSid ? accountSid.slice(0, 6) + '***' : 'MISSING');
console.log('TWILIO_AUTH_TOKEN:', authToken ? authToken.slice(0, 6) + '***' : 'MISSING');
console.log('TWILIO_VERIFY_SERVICE_SID:', verifySid ? verifySid.slice(0, 6) + '***' : 'MISSING');

async function testRealSMS() {
  if (!accountSid || !authToken || !verifySid) {
    console.error('❌ Missing Twilio credentials');
    return;
  }

  const client = twilio(accountSid, authToken);
  const phoneNumber = '+15878881837'; // Andrew's phone

  try {
    console.log(`📱 Sending REAL SMS OTP to ${phoneNumber}...`);
    console.log('Using Verify Service SID:', verifySid);
    
    // Verify Service SID should start with 'VA', not 'AC'
    if (!verifySid.startsWith('VA')) {
      console.error('❌ TWILIO_VERIFY_SERVICE_SID should start with "VA", not "AC"');
      console.error('   Current value looks like Account SID instead of Verify Service SID');
      console.error('   Please create a Verify Service in Twilio Console and use that SID');
      return;
    }
    
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms'
      });

    console.log('✅ SMS sent successfully!');
    console.log('Verification SID:', verification.sid);
    console.log('Status:', verification.status);
    console.log('📱 Check your phone for the OTP code!');

  } catch (error) {
    console.error('❌ Failed to send SMS:', error.message);
    console.error('Error details:', error);
  }
}

testRealSMS();