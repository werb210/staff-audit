/**
 * Server Configuration
 * Handles environment variables and fallbacks for production deployment
 */

// Load environment variables from .env file - if available
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch (e) {
  console.log('dotenv not available, using direct environment variables');
}

// Debug environment variables - development only
if (process.env.NODE_ENV === 'development') {
  console.log("DEBUG ENV VARS:", {
    CLIENT_APP_SHARED_TOKEN: process.env.CLIENT_APP_SHARED_TOKEN ? 'SET' : 'MISSING',
    EXTERNAL_API_SYNC_MODE: process.env.EXTERNAL_API_SYNC_MODE || 'MISSING',
    EXTERNAL_API_KEY: process.env.EXTERNAL_API_KEY ? 'SET' : 'MISSING',
    STAFF_API_URL: process.env.STAFF_API_URL || 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING'
  });
}

// Document signing integration removed from system

// Export External API Key for third-party integrations
export const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;
if (!EXTERNAL_API_KEY) {
  console.warn('EXTERNAL_API_KEY missing - External API sync will be disabled');
}

// Staff API URL configuration - direct environment variable loading
export const STAFF_API_URL = process.env.STAFF_API_URL;
if (!STAFF_API_URL) {
  console.warn('STAFF_API_URL missing - using direct environment variable only');
}

// Production configuration - no fallbacks for security
export const CLIENT_APP_SHARED_TOKEN = process.env.CLIENT_APP_SHARED_TOKEN;
if (!CLIENT_APP_SHARED_TOKEN) {
  throw new Error('CLIENT_APP_SHARED_TOKEN missing in environment variables - abort startup');
}
if (process.env.NODE_ENV === 'development') {
  console.log("CONFIG LOADED:", {
    CLIENT_TOKEN: CLIENT_APP_SHARED_TOKEN.substring(0, 8) + '...',
    EXTERNAL_API: EXTERNAL_API_KEY ? 'configured' : 'missing'
  });
}