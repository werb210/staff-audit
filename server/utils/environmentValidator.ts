/**
 * Environment Variable Validation
 * Ensures all production secrets are properly configured
 */

interface EnvironmentVariable {
  name: string;
  required: boolean;
  description: string;
  category: 'security' | 'database' | 'external' | 'feature';
}

const REQUIRED_VARIABLES: EnvironmentVariable[] = [
  // Security
  { name: 'JWT_SECRET', required: true, description: 'JWT signing secret', category: 'security' },
  { name: 'ADMIN_EMAIL', required: true, description: 'Admin login email', category: 'security' },
  { name: 'ADMIN_PASSWORD', required: true, description: 'Admin login password', category: 'security' },
  { name: 'CLIENT_APP_SHARED_TOKEN', required: true, description: 'Client app API token', category: 'security' },
  { name: 'SESSION_SECRET', required: true, description: 'Session signing secret', category: 'security' },
  
  // Database
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string', category: 'database' },
  
  // External APIs
  { name: 'TWILIO_ACCOUNT_SID', required: false, description: 'Twilio account SID', category: 'external' },
  { name: 'TWILIO_AUTH_TOKEN', required: false, description: 'Twilio auth token', category: 'external' },
  { name: 'TWILIO_VERIFY_SERVICE_SID', required: false, description: 'Twilio verify service SID', category: 'external' },
  
  // Feature flags
  { name: 'DEVELOPMENT_OTP_CODE', required: false, description: 'Development OTP override', category: 'feature' },
  { name: 'FALLBACK_OTP_CODE', required: false, description: 'Production OTP fallback', category: 'feature' },
  { name: 'EXTERNAL_API_SYNC_MODE', required: false, description: 'External API sync mode', category: 'feature' }
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  configured: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];
  const configured: string[] = [];

  // Check each required variable
  REQUIRED_VARIABLES.forEach(variable => {
    const value = process.env[variable.name];
    
    if (!value) {
      if (variable.required) {
        if (process.env.NODE_ENV === 'production') {
          errors.push(`CRITICAL: ${variable.name} is required in production (${variable.description})`);
        } else {
          warnings.push(`Missing ${variable.name} - ${variable.description}`);
        }
      }
      missing.push(variable.name);
    } else {
      configured.push(variable.name);
      
      if (variable.name !== 'ADMIN_PASSWORD' && variable.name !== 'ADMIN_EMAIL' && isInsecureValue(value)) {
        errors.push(`SECURITY: ${variable.name} contains insecure value (${variable.description})`);
      }
    }
  });

  // Check for development-specific issues
  if (process.env.NODE_ENV === 'development') {
    // Warn about missing development helpers
    if (!process.env.DEVELOPMENT_OTP_CODE) {
      warnings.push('DEVELOPMENT_OTP_CODE not set - using random fallback');
    }
  }

  // Check for production-specific issues
  if (process.env.NODE_ENV === 'production') {
    // Ensure no development values in production
    if (process.env.DEVELOPMENT_OTP_CODE) {
      warnings.push('DEVELOPMENT_OTP_CODE should not be set in production');
    }
    
    // Ensure critical security variables are set
    const criticalSecrets = ['JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'CLIENT_APP_SHARED_TOKEN'];
    const missingCritical = criticalSecrets.filter(name => !process.env[name]);
    
    if (missingCritical.length > 0) {
      errors.push(`DEPLOYMENT_BLOCKER: Missing critical secrets: ${missingCritical.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missing,
    configured
  };
}

function isInsecureValue(value: string): boolean {
  const insecurePatterns = [
    /^admin123$/i,
    /^todd123$/i,
    /^testpass123$/i,
    /^password$/i,
    /^123456$/i,
    /^test$/i,
    /^default$/i,
    /^secret$/i,
    /^changeme$/i,
    /^admin$/i,
    /^root$/i,
    /^user$/i,
    /^guest$/i,
    /^demo$/i,
    /^test-token/i,
    /^dummy-token/i,
    /^default-token/i,
    /^fake-/i,
    /^mock-/i,
    /^placeholder/i
  ];

  return insecurePatterns.some(pattern => pattern.test(value));
}

export function generateSecurityReport(): string {
  const result = validateEnvironment();
  
  let report = '\n=== ENVIRONMENT SECURITY REPORT ===\n\n';
  
  if (result.valid) {
    report += '✅ Environment validation PASSED\n\n';
  } else {
    report += '❌ Environment validation FAILED\n\n';
  }
  
  if (result.errors.length > 0) {
    report += '🚨 ERRORS:\n';
    result.errors.forEach(error => {
      report += `  - ${error}\n`;
    });
    report += '\n';
  }
  
  if (result.warnings.length > 0) {
    report += '⚠️  WARNINGS:\n';
    result.warnings.forEach(warning => {
      report += `  - ${warning}\n`;
    });
    report += '\n';
  }
  
  report += `📊 STATISTICS:\n`;
  report += `  - Configured: ${result.configured.length}\n`;
  report += `  - Missing: ${result.missing.length}\n`;
  report += `  - Environment: ${process.env.NODE_ENV}\n\n`;
  
  if (result.missing.length > 0) {
    report += '📋 MISSING VARIABLES:\n';
    result.missing.forEach(name => {
      const variable = REQUIRED_VARIABLES.find(v => v.name === name);
      report += `  - ${name}: ${variable?.description || 'No description'}\n`;
    });
    report += '\n';
  }
  
  if (!result.valid) {
    report += '🔧 RECOMMENDED ACTIONS:\n';
    report += '  1. Set all required environment variables\n';
    report += '  2. Replace insecure default values\n';
    report += '  3. Use strong, unique secrets for production\n';
    report += '  4. Consider using a secrets manager\n\n';
  }
  
  return report;
}

export function throwIfInvalid(): void {
  const result = validateEnvironment();
  
  if (!result.valid) {
    console.error(generateSecurityReport());
    throw new Error(`Environment validation failed: ${result.errors.join(', ')}`);
  }
}