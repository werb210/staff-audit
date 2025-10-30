// Rate limiting configuration
const OTP_RATE_LIMITS = {
    // Maximum OTP attempts per IP per hour
    MAX_OTP_ATTEMPTS_PER_IP_PER_HOUR: process.env.NODE_ENV === 'development' ? 1000 : 10,
    // Maximum OTP attempts per email per hour
    MAX_OTP_ATTEMPTS_PER_EMAIL_PER_HOUR: process.env.NODE_ENV === 'development' ? 1000 : 5,
    // Maximum failed verification attempts per IP per hour
    MAX_FAILED_VERIFICATIONS_PER_IP_PER_HOUR: process.env.NODE_ENV === 'development' ? 1000 : 20,
    // Lockout duration in minutes
    LOCKOUT_DURATION_MINUTES: process.env.NODE_ENV === 'development' ? 0.1 : 15,
    // Time window in minutes for rate limiting
    TIME_WINDOW_MINUTES: process.env.NODE_ENV === 'development' ? 1 : 60
};
// In-memory rate limiting store (consider Redis for production)
const rateLimitStore = new Map();
/**
 * Rate limiter for OTP generation requests
 */
export const otpGenerationRateLimit = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const email = req.body.email;
    const currentTime = new Date();
    // Check IP-based rate limiting
    const ipKey = `otp_gen_ip_${clientIP}`;
    const ipRecord = rateLimitStore.get(ipKey);
    if (ipRecord) {
        const timeDiff = currentTime.getTime() - ipRecord.lastAttempt.getTime();
        const minutesElapsed = timeDiff / (1000 * 60);
        // Check if still locked out
        if (ipRecord.lockedUntil && currentTime < ipRecord.lockedUntil) {
            const remainingMinutes = Math.ceil((ipRecord.lockedUntil.getTime() - currentTime.getTime()) / (1000 * 60));
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                code: 'IP_LOCKED',
                message: `Too many OTP requests. Try again in ${remainingMinutes} minutes.`,
                retryAfter: remainingMinutes * 60
            });
        }
        // Reset counter if time window has passed
        if (minutesElapsed >= OTP_RATE_LIMITS.TIME_WINDOW_MINUTES) {
            ipRecord.attempts = 0;
        }
        // Check if IP has exceeded limit
        if (ipRecord.attempts >= OTP_RATE_LIMITS.MAX_OTP_ATTEMPTS_PER_IP_PER_HOUR) {
            ipRecord.lockedUntil = new Date(currentTime.getTime() + OTP_RATE_LIMITS.LOCKOUT_DURATION_MINUTES * 60 * 1000);
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                code: 'IP_RATE_LIMIT',
                message: `Too many OTP requests from this IP. Locked for ${OTP_RATE_LIMITS.LOCKOUT_DURATION_MINUTES} minutes.`,
                retryAfter: OTP_RATE_LIMITS.LOCKOUT_DURATION_MINUTES * 60
            });
        }
        // Increment attempts
        ipRecord.attempts++;
        ipRecord.lastAttempt = currentTime;
    }
    else {
        // Create new IP record
        rateLimitStore.set(ipKey, {
            ip: clientIP,
            attempts: 1,
            lastAttempt: currentTime
        });
    }
    // Check email-based rate limiting
    if (email) {
        const emailKey = `otp_gen_email_${email}`;
        const emailRecord = rateLimitStore.get(emailKey);
        if (emailRecord) {
            const timeDiff = currentTime.getTime() - emailRecord.lastAttempt.getTime();
            const minutesElapsed = timeDiff / (1000 * 60);
            // Reset counter if time window has passed
            if (minutesElapsed >= OTP_RATE_LIMITS.TIME_WINDOW_MINUTES) {
                emailRecord.attempts = 0;
            }
            // Check if email has exceeded limit
            if (emailRecord.attempts >= OTP_RATE_LIMITS.MAX_OTP_ATTEMPTS_PER_EMAIL_PER_HOUR) {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded',
                    code: 'EMAIL_RATE_LIMIT',
                    message: `Too many OTP requests for this email. Try again in ${Math.ceil(OTP_RATE_LIMITS.TIME_WINDOW_MINUTES - minutesElapsed)} minutes.`,
                    retryAfter: (OTP_RATE_LIMITS.TIME_WINDOW_MINUTES - minutesElapsed) * 60
                });
            }
            // Increment attempts
            emailRecord.attempts++;
            emailRecord.lastAttempt = currentTime;
        }
        else {
            // Create new email record
            rateLimitStore.set(emailKey, {
                ip: clientIP,
                email,
                attempts: 1,
                lastAttempt: currentTime
            });
        }
    }
    next();
};
/**
 * Rate limiter for OTP verification requests
 */
export const otpVerificationRateLimit = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const currentTime = new Date();
    const ipKey = `otp_verify_ip_${clientIP}`;
    const ipRecord = rateLimitStore.get(ipKey);
    if (ipRecord) {
        const timeDiff = currentTime.getTime() - ipRecord.lastAttempt.getTime();
        const minutesElapsed = timeDiff / (1000 * 60);
        // Check if still locked out
        if (ipRecord.lockedUntil && currentTime < ipRecord.lockedUntil) {
            const remainingMinutes = Math.ceil((ipRecord.lockedUntil.getTime() - currentTime.getTime()) / (1000 * 60));
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                code: 'VERIFICATION_LOCKED',
                message: `Too many failed verification attempts. Try again in ${remainingMinutes} minutes.`,
                retryAfter: remainingMinutes * 60
            });
        }
        // Reset counter if time window has passed
        if (minutesElapsed >= OTP_RATE_LIMITS.TIME_WINDOW_MINUTES) {
            ipRecord.attempts = 0;
        }
    }
    next();
};
/**
 * Record failed OTP verification attempt
 */
export const recordFailedVerification = (req) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const currentTime = new Date();
    const ipKey = `otp_verify_ip_${clientIP}`;
    const ipRecord = rateLimitStore.get(ipKey);
    if (ipRecord) {
        ipRecord.attempts = (ipRecord.attempts || 0) + 1;
        ipRecord.lastAttempt = currentTime;
        // Lock IP if too many failed attempts
        if (ipRecord.attempts >= OTP_RATE_LIMITS.MAX_FAILED_VERIFICATIONS_PER_IP_PER_HOUR) {
            ipRecord.lockedUntil = new Date(currentTime.getTime() + OTP_RATE_LIMITS.LOCKOUT_DURATION_MINUTES * 60 * 1000);
        }
    }
    else {
        rateLimitStore.set(ipKey, {
            ip: clientIP,
            attempts: 1,
            lastAttempt: currentTime
        });
    }
};
/**
 * Clear rate limit for successful verification
 */
export const clearRateLimit = (req, email) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const ipKey = `otp_verify_ip_${clientIP}`;
    // Clear IP-based rate limiting
    rateLimitStore.delete(ipKey);
    // Clear email-based rate limiting
    if (email) {
        const emailKey = `otp_gen_email_${email}`;
        rateLimitStore.delete(emailKey);
    }
};
/**
 * Development rate limit reset for testing
 */
export const clearAllRateLimits = () => {
    if (process.env.NODE_ENV === 'development') {
        rateLimitStore.clear();
        console.log('🔄 Development mode: All rate limits cleared');
        return true;
    }
    return false;
};
/**
 * Cleanup old rate limit records (run periodically)
 */
export const cleanupRateLimits = () => {
    const currentTime = new Date();
    const cutoffTime = new Date(currentTime.getTime() - OTP_RATE_LIMITS.TIME_WINDOW_MINUTES * 60 * 1000);
    for (const [key, record] of rateLimitStore.entries()) {
        if (record.lastAttempt < cutoffTime && (!record.lockedUntil || record.lockedUntil < currentTime)) {
            rateLimitStore.delete(key);
        }
    }
};
// Run cleanup every 10 minutes
setInterval(cleanupRateLimits, 10 * 60 * 1000);
