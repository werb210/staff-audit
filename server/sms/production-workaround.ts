/**
 * Production SMS Workaround for A2P 10DLC Issues
 * Implements bypass method for immediate functionality
 */

import twilio from 'twilio';

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  STAFF_TODD_E164,
  PUBLIC_BASE_URL
} = process.env;

export interface WorkaroundResult {
  success: boolean;
  code?: string;
  message?: string;
  method?: string;
  error?: string;
}

const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);

// Simple in-memory storage for development (replace with Redis in production)
const verificationCodes = new Map<string, { code: string; expires: number }>();

/**
 * Generate and "send" verification code
 * For A2P 10DLC issues, this bypasses SMS and logs the code
 */
export async function sendWorkaroundOTP(phoneNumber: string): Promise<WorkaroundResult> {
  try {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + (10 * 60 * 1000); // 10 minutes
    
    // Store code for verification
    verificationCodes.set(phoneNumber, { code, expires });
    
    console.log('🚨 [WORKAROUND] A2P 10DLC bypass - Code for', phoneNumber + ':', code);
    console.log('🚨 [WORKAROUND] In production, configure A2P 10DLC to enable real SMS');
    
    // Try to send via Voice call as fallback (often works when SMS fails)
    try {
      if (phoneNumber === STAFF_TODD_E164) {
        console.log('📞 [WORKAROUND] Attempting voice call delivery...');
        
        const call = await client.calls.create({
          url: `${PUBLIC_BASE_URL}/api/voice/speak-code?code=${code}`,
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER || '+18254511768'
        });
        
        console.log('✅ [WORKAROUND] Voice call initiated:', call.sid);
        
        return {
          success: true,
          code: code,
          message: 'Verification code sent via voice call',
          method: 'voice-call'
        };
      }
    } catch (voiceError) {
      console.log('⚠️ [WORKAROUND] Voice call failed, using console display:', voiceError);
    }
    
    return {
      success: true,
      code: code,
      message: 'Verification code generated (check server console for A2P bypass)',
      method: 'console-display'
    };
    
  } catch (error: any) {
    console.error('❌ [WORKAROUND] Error generating code:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify the workaround OTP code
 */
export function verifyWorkaroundOTP(phoneNumber: string, inputCode: string): { valid: boolean; error?: string } {
  const stored = verificationCodes.get(phoneNumber);
  
  if (!stored) {
    return { valid: false, error: 'No verification code found for this number' };
  }
  
  if (Date.now() > stored.expires) {
    verificationCodes.delete(phoneNumber);
    return { valid: false, error: 'Verification code has expired' };
  }
  
  if (stored.code === inputCode) {
    verificationCodes.delete(phoneNumber);
    console.log('✅ [WORKAROUND] Code verified successfully for:', phoneNumber);
    return { valid: true };
  }
  
  return { valid: false, error: 'Invalid verification code' };
}

/**
 * Clean up expired codes
 */
export function cleanupExpiredCodes(): void {
  const now = Date.now();
  for (const [phone, data] of verificationCodes.entries()) {
    if (now > data.expires) {
      verificationCodes.delete(phone);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredCodes, 5 * 60 * 1000);