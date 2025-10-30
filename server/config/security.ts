/**
 * Security Configuration for Production-Grade OTP System
 * Contains hardened security settings and environment validation
 */

export const SECURITY_CONFIG = {
  // Environment validation
  PRODUCTION_MODE: process.env.NODE_ENV === 'production',
  
  // OTP Security Settings
  OTP: {
    // Prevent production systems from accepting development OTP
    BLOCK_DEV_OTP_IN_PRODUCTION: true,
    DEV_MODE_OTP: process.env.DEVELOPMENT_OTP_CODE || '123456',
    
    // Production OTP length (6 digits)
    LENGTH: 6,
    
    // OTP expiration (10 minutes)
    EXPIRATION_MINUTES: 10,
    
    // Maximum attempts before lockout
    MAX_ATTEMPTS: 3,
    
    // Cooldown between OTP generations (1 minute)
    GENERATION_COOLDOWN_MINUTES: 1
  },
  
  // Rate Limiting Configuration
  RATE_LIMITS: {
    // OTP generation limits
    MAX_OTP_ATTEMPTS_PER_IP_PER_HOUR: 10,
    MAX_OTP_ATTEMPTS_PER_EMAIL_PER_HOUR: 5,
    
    // Verification limits
    MAX_FAILED_VERIFICATIONS_PER_IP_PER_HOUR: 20,
    
    // Lockout settings
    LOCKOUT_DURATION_MINUTES: 15,
    TIME_WINDOW_MINUTES: 60
  },
  
  // JWT Security
  JWT: {
    // Require minimum JWT secret length
    MIN_SECRET_LENGTH: 32,
    RECOMMENDED_SECRET_LENGTH: 64,
    
    // Token expiration
    TEMP_TOKEN_EXPIRATION: '5m',
    FULL_TOKEN_EXPIRATION: '8h'
  },
  
  // IP Security
  IP_SECURITY: {
    TRUST_PROXY: true,
    
    // Rate limit cleanup interval (10 minutes)
    CLEANUP_INTERVAL_MINUTES: 10
  }
};

/**
 * Validate security configuration on startup
 */
export function validateSecurityConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate JWT secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (jwtSecret.length < SECURITY_CONFIG.JWT.MIN_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be at least ${SECURITY_CONFIG.JWT.MIN_SECRET_LENGTH} characters`);
  } else if (jwtSecret.length < SECURITY_CONFIG.JWT.RECOMMENDED_SECRET_LENGTH) {
    warnings.push(`JWT_SECRET should be at least ${SECURITY_CONFIG.JWT.RECOMMENDED_SECRET_LENGTH} characters for optimal security`);
  }
  
  // Production environment checks
  if (SECURITY_CONFIG.PRODUCTION_MODE) {
    // Ensure development features are disabled in production
    if (process.env.DEV_MODE_OTP && process.env.DEV_MODE_OTP !== 'false') {
      errors.push('DEV_MODE_OTP must be disabled in production');
    }
    
    // Ensure required production environment variables
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      warnings.push('Twilio credentials recommended for production SMS delivery');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log security configuration status
 */
export function logSecurityStatus(): void {
  const validation = validateSecurityConfig();
  
  console.log('🔐 Security Configuration Status:');
  console.log(`   Environment: ${SECURITY_CONFIG.PRODUCTION_MODE ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`   JWT Secret: ${process.env.JWT_SECRET ? `${process.env.JWT_SECRET.length} characters` : 'MISSING'}`);
  console.log(`   OTP Length: ${SECURITY_CONFIG.OTP.LENGTH} digits`);
  console.log(`   Rate Limiting: ENABLED`);
  
  if (validation.warnings.length > 0) {
    console.log('⚠️  Security Warnings:');
    validation.warnings.forEach(warning => console.log(`   • ${warning}`));
  }
  
  if (validation.errors.length > 0) {
    console.log('🚨 Security Errors:');
    validation.errors.forEach(error => console.log(`   • ${error}`));
    
    if (SECURITY_CONFIG.PRODUCTION_MODE) {
      console.log('🛑 Exiting due to security configuration errors in production');
      process.exit(1);
    }
  }
  
  if (validation.valid) {
    console.log('✅ Security configuration validated successfully');
  }
}