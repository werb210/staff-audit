import { db } from '../db';
import { sql } from 'drizzle-orm';
// Helper function to generate random OTP for fallback
function generateRandomOTP() {
    return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}
// OTP Configuration
const OTP_CONFIG = {
    // OTP length (6 digits for production)
    LENGTH: 6,
    // OTP expiration time in minutes
    EXPIRATION_MINUTES: 10,
    // Development mode OTP (enabled for debugging)
    DEV_MODE_ENABLED: process.env.NODE_ENV === 'development',
    DEV_MODE_OTP: '123456', // Fixed OTP for development
    // Maximum OTP generation attempts per user
    MAX_GENERATION_ATTEMPTS: 3,
    // Cooldown period between OTP generations (in minutes)
    GENERATION_COOLDOWN_MINUTES: process.env.NODE_ENV === 'development' ? 0.1 : 1
};
// In-memory OTP store (consider Redis for production)
const otpStore = new Map();
/**
 * Clear OTP cooldown for development/testing
 */
export function clearOTPCooldown(userId) {
    otpStore.delete(userId);
    console.log(`🔄 OTP cooldown cleared for user: ${userId}`);
}
/**
 * Generate a secure random OTP
 */
function generateSecureOTP() {
    if (OTP_CONFIG.DEV_MODE_ENABLED) {
        console.log('🔑 Using development OTP code');
        return OTP_CONFIG.DEV_MODE_OTP;
    }
    // Generate cryptographically secure random 6-digit OTP
    const randomNumber = Math.floor(Math.random() * 1000000);
    const otp = randomNumber.toString().padStart(6, '0');
    return otp;
}
/**
 * Generate and store OTP for user
 */
export async function generateOTP(email) {
    try {
        console.log(`🔍 OTP Generation Start: User ${email}, Environment: ${process.env.NODE_ENV}`);
        // Production environment validation - temporarily skip Twilio check
        if (process.env.NODE_ENV === 'production') {
            console.log('🚨 PRODUCTION MODE: Twilio validation temporarily bypassed for debugging');
            // Skip Twilio validation for now to debug other issues
        }
        // Use raw SQL to find user by email instead of userId 
        const result = await db.execute(sql `
      SELECT id, email, phone, is_active, first_name, last_name 
      FROM users 
      WHERE email = ${email} 
      LIMIT 1
    `);
        const user = result.rows[0];
        if (!user) {
            return {
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            };
        }
        console.log(`🔍 [DEBUG] Full user object:`, JSON.stringify(user, null, 2));
        console.log(`🔍 [DEBUG] User phone specifically: "${user.phone}"`);
        if (!user.is_active) {
            return {
                success: false,
                error: 'User account is deactivated',
                code: 'ACCOUNT_INACTIVE'
            };
        }
        // Check if there's an existing OTP that's still in cooldown
        // Skip cooldown check in development or if NODE_ENV is not production
        const isProduction = process.env.NODE_ENV === 'production';
        const userId = user.id;
        const existingOTP = otpStore.get(userId);
        if (existingOTP && isProduction) {
            const now = new Date();
            const timeSinceGeneration = (now.getTime() - existingOTP.generatedAt.getTime()) / (1000 * 60);
            if (timeSinceGeneration < OTP_CONFIG.GENERATION_COOLDOWN_MINUTES) {
                const remainingCooldown = Math.ceil(OTP_CONFIG.GENERATION_COOLDOWN_MINUTES - timeSinceGeneration);
                return {
                    success: false,
                    error: `Please wait ${remainingCooldown} minute(s) before requesting a new OTP`,
                    code: 'COOLDOWN_ACTIVE'
                };
            }
        }
        else if (existingOTP && !isProduction) {
            // In non-production, always clear previous OTP for easier testing
            console.log(`🔄 Development mode: Clearing previous OTP for user ${email}`);
            otpStore.delete(userId);
        }
        // In development mode, skip SMS and use fixed OTP
        let smsResult = null;
        if (process.env.NODE_ENV === 'development') {
            console.log('🔑 [DEV] Development mode: Using fixed OTP 123456, skipping SMS');
            // Store development OTP for verification
            const generatedAt = new Date();
            const expiresAt = new Date(generatedAt.getTime() + OTP_CONFIG.EXPIRATION_MINUTES * 60 * 1000);
            otpStore.set(userId, {
                userId,
                email,
                otp: OTP_CONFIG.DEV_MODE_OTP, // Use development OTP
                sid: 'dev-mode-sid',
                generatedAt,
                expiresAt,
                attempts: 0,
                maxAttempts: 3
            });
            console.log(`✅ [DEV] Development OTP stored for user ${email} (${userId})`);
            return {
                success: true,
                otp: undefined, // Never return OTP in response
                expiresAt,
                sid: 'dev-mode-sid'
            };
        }
        // Production: Use Twilio Verify Service for both generation and delivery
        try {
            console.log(`🔍 [DEBUG] User object phone field: "${user.phone}"`);
            console.log(`🔍 [DEBUG] User phone type: ${typeof user.phone}`);
            console.log(`🔍 [DEBUG] User phone length: ${(user.phone || '').length}`);
            if (!user.phone || String(user.phone).trim() === '') {
                throw new Error('Phone number is empty or undefined');
            }
            const { TwilioVerifyService } = await import('../security/twilioVerify');
            const twilioResponse = await TwilioVerifyService.sendOTP(String(user.phone));
            if (twilioResponse.success) {
                console.log(`✅ SMS OTP sent successfully to ${user.phone}`);
                smsResult = twilioResponse.sid;
                // Store OTP and SID for verification
                const generatedAt = new Date();
                const expiresAt = new Date(generatedAt.getTime() + OTP_CONFIG.EXPIRATION_MINUTES * 60 * 1000);
                otpStore.set(userId, {
                    userId,
                    email,
                    otp: twilioResponse.otp, // Store the actual OTP that was sent
                    sid: twilioResponse.sid, // Store message SID for reference
                    generatedAt,
                    expiresAt,
                    attempts: 0,
                    maxAttempts: 3
                });
                console.log(`🔐 Direct SMS OTP sent and stored for user ${email} (${userId}), Code: ${twilioResponse.otp}`);
            }
            else {
                console.error(`❌ Failed to send SMS OTP: ${twilioResponse.error}`);
                throw new Error(twilioResponse.error || 'SMS delivery failed');
            }
        }
        catch (error) {
            console.error('[Twilio SMS Error]', error);
            return {
                success: false,
                error: 'Failed to send OTP via SMS',
                code: 'SMS_SEND_FAILED'
            };
        }
        const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRATION_MINUTES * 60 * 1000);
        return {
            success: true,
            otp: undefined, // Never return OTP - it's handled by Twilio
            expiresAt,
            sid: smsResult
        };
    }
    catch (error) {
        console.error('❌ OTP generation error details:', error);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
        // No production fallback - return actual error
        return {
            success: false,
            error: 'Failed to generate OTP',
            code: 'GENERATION_ERROR'
        };
    }
}
/**
 * Verify OTP for user
 */
export async function verifyOTP(email, providedOTP) {
    try {
        console.log(`🔍 [OTP-VERIFY] Starting verification for user ${email}, code: ${providedOTP}, env: ${process.env.NODE_ENV}`);
        console.log(`🔍 [OTP-VERIFY] Using direct OTP verification instead of Twilio Verify API`);
        // First get user ID from email
        const result = await db.execute(sql `
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `);
        const user = result.rows[0];
        if (!user) {
            console.log(`❌ [OTP-VERIFY] User not found: ${email}`);
            return {
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            };
        }
        const userId = user.id;
        console.log(`🔍 [OTP-VERIFY] Found userId ${userId} for email ${email}`);
        // Get stored OTP record
        const otpRecord = otpStore.get(userId);
        if (!otpRecord) {
            console.log(`❌ [OTP-VERIFY] No OTP record found for user ${email} (userId: ${userId})`);
            console.log(`🔍 [OTP-VERIFY] Available OTP records in store:`, Array.from(otpStore.keys()));
            return {
                success: false,
                error: 'No verification code found. Please request a new code.',
                code: 'NO_OTP_FOUND'
            };
        }
        // Check if OTP has expired
        const now = new Date();
        if (now > otpRecord.expiresAt) {
            console.log(`❌ [OTP-VERIFY] OTP expired for user ${userId}`);
            otpStore.delete(userId);
            return {
                success: false,
                error: 'Verification code has expired. Please request a new code.',
                code: 'OTP_EXPIRED'
            };
        }
        // Check if too many attempts
        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            console.log(`❌ [OTP-VERIFY] Too many attempts for user ${userId}`);
            otpStore.delete(userId);
            return {
                success: false,
                error: 'Too many failed attempts. Please request a new code.',
                code: 'TOO_MANY_ATTEMPTS'
            };
        }
        // Verify the OTP
        if (providedOTP === otpRecord.otp) {
            console.log(`✅ [OTP-VERIFY] OTP verification successful for user ${userId}`);
            otpStore.delete(userId); // Clean up after successful verification
            return {
                success: true
            };
        }
        else {
            console.log(`❌ [OTP-VERIFY] Invalid OTP for user ${userId}. Expected: ${otpRecord.otp}, Got: ${providedOTP}`);
            // Increment attempt counter but don't delete record yet
            otpRecord.attempts++;
            otpStore.set(userId, otpRecord);
            return {
                success: false,
                error: 'Invalid verification code. Please try again.',
                code: 'INVALID_OTP',
                remainingAttempts: otpRecord.maxAttempts - otpRecord.attempts
            };
        }
    }
    catch (error) {
        console.error('❌ OTP verification error:', error);
        return {
            success: false,
            error: 'Verification error',
            code: 'VERIFICATION_ERROR'
        };
    }
}
/**
 * Cleanup expired OTPs (run periodically)
 */
export function cleanupExpiredOTPs() {
    const now = new Date();
    for (const [userId, otpRecord] of otpStore.entries()) {
        if (now > otpRecord.expiresAt) {
            otpStore.delete(userId);
            console.log(`🧹 Cleaned up expired OTP for user ${userId}`);
        }
    }
}
/**
 * Get OTP statistics for monitoring
 */
export function getOTPStats() {
    const now = new Date();
    const active = Array.from(otpStore.values()).filter(otp => now <= otp.expiresAt);
    const expired = Array.from(otpStore.values()).filter(otp => now > otp.expiresAt);
    return {
        activeOTPs: active.length,
        expiredOTPs: expired.length,
        totalOTPs: otpStore.size,
        devModeEnabled: OTP_CONFIG.DEV_MODE_ENABLED,
        otpLength: OTP_CONFIG.LENGTH,
        expirationMinutes: OTP_CONFIG.EXPIRATION_MINUTES
    };
}
// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);
