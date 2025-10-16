// Enhanced security headers middleware
import helmet from "helmet";
import type { RequestHandler } from "express";

export const securityHeaders: RequestHandler = helmet({
  // X-Frame-Options - prevent clickjacking
  frameguard: { action: 'deny' },
  
  // X-Content-Type-Options - prevent MIME type sniffing
  xContentTypeOptions: true,
  
  // Referrer-Policy - control referrer information
  referrerPolicy: { policy: 'same-origin' },
  
  // X-Download-Options - prevent file downloads in older IE
  ieNoOpen: true,
  
  // X-XSS-Protection - enable XSS filtering (legacy browsers)
  xssFilter: true,
  
  // Strict-Transport-Security - enforce HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Note: Permissions-Policy configured via CSP where supported
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
  
  // Don't set CSP here - handled by csp.ts
  contentSecurityPolicy: false
});