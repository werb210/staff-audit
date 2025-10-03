/**
 * Dynamic Base URL Generation for Dev/Production Environments
 * Prevents hardcoded production URLs from breaking Replit preview
 */

export function getBaseUrl(req?: any): string {
  // In production, always use the configured production URL
  if (process.env.NODE_ENV === 'production') {
    return process.env.BASE_URL || 'https://boreal.financial';
  }
  
  // In development, use the request hostname if available (for Replit preview)
  if (req?.hostname && /\.replit\.dev$/i.test(req.hostname)) {
    return `https://${req.hostname}`;
  }
  
  // Fallback to localhost for local development
  return process.env.BASE_URL || 'http://localhost:5000';
}

export function getCallbackUrl(path: string, req?: any): string {
  return `${getBaseUrl(req)}${path.startsWith('/') ? path : '/' + path}`;
}