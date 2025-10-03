// server/security/productionLogging.ts - Production-safe logging
export function setupProductionLogging() {
  if (process.env.NODE_ENV === 'production') {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Filter sensitive patterns from log output
    const filterSensitiveData = (arg: any) => {
      if (typeof arg === 'string') {
        return arg
          .replace(/Bearer\s+[A-Za-z0-9\-_.]+/g, 'Bearer [REDACTED]')
          .replace(/password['":][\s]*['"][^'"]+['"]/gi, 'password: "[REDACTED]"')
          .replace(/secret['":][\s]*['"][^'"]+['"]/gi, 'secret: "[REDACTED]"')
          .replace(/token['":][\s]*['"][^'"]+['"]/gi, 'token: "[REDACTED]"')
          .replace(/api_key['":][\s]*['"][^'"]+['"]/gi, 'api_key: "[REDACTED]"')
          .replace(/auth['":][\s]*['"][^'"]+['"]/gi, 'auth: "[REDACTED]"')
          .replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[CARD-REDACTED]')
          .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]');
      }
      return arg;
    };

    // Override console methods with filtering
    console.log = (...args: any[]) => {
      const safeArgs = args.map(filterSensitiveData);
      originalLog.apply(console, safeArgs);
    };

    console.error = (...args: any[]) => {
      const safeArgs = args.map(filterSensitiveData);
      originalError.apply(console, safeArgs);
    };

    console.warn = (...args: any[]) => {
      const safeArgs = args.map(filterSensitiveData);
      originalWarn.apply(console, safeArgs);
    };

    console.log('🔒 Production logging filter activated');
  }
}

// Rate limiting for console logs in production
let logCount = 0;
let lastLogReset = Date.now();

export function rateLimitLogs() {
  if (process.env.NODE_ENV === 'production') {
    const now = Date.now();
    if (now - lastLogReset > 60000) { // Reset every minute
      logCount = 0;
      lastLogReset = now;
    }
    
    logCount++;
    if (logCount > 100) { // Max 100 logs per minute
      return false;
    }
  }
  return true;
}