/**
 * Security Validator Utility
 * Comprehensive security validation functions for enterprise-grade protection
 */
import jwt from 'jsonwebtoken';
import { z } from 'zod';
// Environment variable validation
export function validateEnvironmentSecurity() {
    const errors = [];
    // Critical environment variables that must be set
    const requiredEnvVars = [
        'JWT_SECRET',
        'DATABASE_URL'
    ];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            errors.push(`Missing critical environment variable: ${envVar}`);
        }
    }
    // Validate JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters for security');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
// SQL injection prevention schemas
export const securitySchemas = {
    applicationId: z.string().uuid('Invalid application ID format'),
    documentId: z.string().regex(/^\d+$/, 'Invalid document ID format'),
    userId: z.string().uuid('Invalid user ID format'),
    filename: z.string()
        .max(255, 'Filename too long')
        .refine(name => !name.includes('..'), 'Path traversal detected in filename')
        .refine(name => !name.includes('/'), 'Invalid path character in filename')
        .refine(name => !name.includes('\\'), 'Invalid path character in filename'),
    phoneNumber: z.string().regex(/^\+1\d{10}$/, 'Invalid E.164 phone number format'),
    email: z.string().email('Invalid email format').max(255),
    searchQuery: z.string().max(100, 'Search query too long')
};
// Input sanitization functions
export function sanitizeFilename(filename) {
    // Remove path traversal patterns
    let sanitized = filename.replace(/\.\./g, '');
    // Remove path separators
    sanitized = sanitized.replace(/[\/\\]/g, '');
    // Allow only safe characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Limit length
    if (sanitized.length > 255) {
        const ext = sanitized.split('.').pop() || '';
        const nameWithoutExt = sanitized.substring(0, 250 - ext.length);
        sanitized = `${nameWithoutExt}.${ext}`;
    }
    return sanitized;
}
export function sanitizeSearchQuery(query) {
    // Escape SQL LIKE wildcards
    return String(query).replace(/[%_\\]/g, '\\$&').trim();
}
// Authentication validation
export function validateJWTToken(token) {
    try {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            return { valid: false, error: 'JWT_SECRET not configured' };
        }
        const payload = jwt.verify(token, JWT_SECRET);
        return { valid: true, payload };
    }
    catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Invalid token'
        };
    }
}
// Path traversal validation
export function validatePath(userPath, allowedBasePath) {
    const path = require('path');
    const resolvedPath = path.resolve(allowedBasePath, userPath);
    const normalizedBasePath = path.resolve(allowedBasePath);
    // Ensure the resolved path starts with the allowed base path
    return resolvedPath.startsWith(normalizedBasePath);
}
export function validateFileUpload(file) {
    const errors = [];
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        errors.push('File size exceeds 10MB limit');
    }
    // Validate filename
    try {
        securitySchemas.filename.parse(file.originalname);
    }
    catch (error) {
        errors.push('Invalid filename format');
    }
    // Check allowed MIME types
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];
    if (!allowedTypes.includes(file.mimetype)) {
        errors.push(`File type ${file.mimetype} not allowed`);
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
// Security audit functions
export function auditSecurityConfiguration() {
    const issues = [];
    const recommendations = [];
    let score = 100;
    // Check environment security
    const envValidation = validateEnvironmentSecurity();
    if (!envValidation.valid) {
        issues.push(...envValidation.errors);
        score -= envValidation.errors.length * 10;
    }
    // Check if in production mode with proper security
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
            issues.push('Production JWT_SECRET should be at least 32 characters');
            score -= 15;
        }
        recommendations.push('Ensure all production secrets are properly configured');
        recommendations.push('Enable security headers in production');
        recommendations.push('Use HTTPS in production');
    }
    return {
        score: Math.max(0, score),
        issues,
        recommendations
    };
}
export default {
    validateEnvironmentSecurity,
    securitySchemas,
    sanitizeFilename,
    sanitizeSearchQuery,
    validateJWTToken,
    validatePath,
    validateFileUpload,
    auditSecurityConfiguration
};
