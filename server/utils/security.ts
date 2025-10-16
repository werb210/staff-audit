/**
 * Security Utilities
 * Provides comprehensive security functions for data sanitization and protection
 */

import { z } from 'zod';

/**
 * Sanitizes user objects by removing sensitive fields
 */
export function sanitizeUser(user: any): any {
  if (!user) return null;
  
  const { passwordHash, password, ...sanitized } = user;
  return sanitized;
}

/**
 * Sanitizes an array of user objects
 */
export function sanitizeUsers(users: any[]): any[] {
  return users.map(sanitizeUser);
}

/**
 * Removes sensitive fields from any object
 */
export function sanitizeObject(obj: any, sensitiveFields: string[] = ['password', 'passwordHash', 'token', 'secret']): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!sensitiveFields.includes(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Input validation schemas
 */
export const securitySchemas = {
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .max(20),
  
  uuid: z.string().uuid('Invalid UUID format'),
  
  filename: z.string()
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename format'),
  
  applicationId: z.string().uuid('Invalid application ID'),
  
  // File upload validation
  fileUpload: z.object({
    mimetype: z.enum([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ], { errorMap: () => ({ message: 'Invalid file type' }) }),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB')
  })
};

/**
 * Validates and sanitizes request body
 */
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: any): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

/**
 * Secure filename sanitization to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

/**
 * Rate limiting helper
 */
export const rateLimits = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts'
  },
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    message: 'Too many upload attempts'
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many API requests'
  }
};

/**
 * Security headers for responses
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), fullscreen=(self), payment=()'
};

/**
 * Applies security headers to response
 */
export function applySecurityHeaders(res: any): void {
  Object.entries(securityHeaders).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
}