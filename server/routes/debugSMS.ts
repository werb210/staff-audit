/**
 * Debug SMS Testing Route
 * Temporary route to test Twilio SMS functionality
 */

import { Router, Request, Response } from 'express';
import { TwilioService } from '../utils/twilioService';

const router = Router();

/**
 * POST /api/debug/send-test-sms - Send test SMS to verify Twilio setup
 */
router.post('/send-test-sms', async (req: Request, res: Response) => {
  try {
    console.log('🧪 [DEBUG SMS] Testing SMS functionality...');
    console.log('📱 [DEBUG SMS] Twilio Account SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING');
    console.log('🔑 [DEBUG SMS] Twilio Auth Token:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING');
    console.log('📞 [DEBUG SMS] Twilio Phone Number:', process.env.TWILIO_PHONE_NUMBER || 'MISSING');
    
    const testPhoneNumber = '+15878881837'; // Your phone number from the request
    const testMessage = '🔐 Test SMS from Staff App - Twilio is working!';
    
    console.log(`📤 [DEBUG SMS] Sending test SMS to: ${testPhoneNumber}`);
    
    const result = await TwilioService.MessagingService.sendSMS(testPhoneNumber, testMessage);
    
    console.log('📊 [DEBUG SMS] SMS Result:', result);
    
    return res.json({
      success: true,
      message: 'Test SMS sent successfully',
      result: result,
      testPhone: testPhoneNumber,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error('❌ [DEBUG SMS] Error sending test SMS:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to send test SMS',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/debug/twilio-config - Check Twilio configuration
 */
router.get('/twilio-config', async (req: Request, res: Response) => {
  try {
    const config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'SET (***' + process.env.TWILIO_ACCOUNT_SID.slice(-4) + ')' : 'MISSING',
      authToken: process.env.TWILIO_AUTH_TOKEN ? 'SET (***' + process.env.TWILIO_AUTH_TOKEN.slice(-4) + ')' : 'MISSING',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'MISSING',
      isConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
    };
    
    return res.json({
      success: true,
      config: config,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      error: 'Failed to check Twilio configuration',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;