/**
 * Input Validation Middleware
 * Comprehensive request validation for all API endpoints
 */
import { z } from 'zod';
import { validateAndSanitize, securitySchemas } from '../utils/security';
/**
 * Generic validation middleware factory
 */
export function validateRequest(schema) {
    return (req, res, next) => {
        const errors = [];
        // Validate request body
        if (schema.body && req.body) {
            const bodyValidation = validateAndSanitize(schema.body, req.body);
            if (!bodyValidation.success) {
                errors.push(...bodyValidation.errors.map(err => `Body: ${err}`));
            }
            else {
                req.body = bodyValidation.data;
            }
        }
        // Validate request parameters
        if (schema.params) {
            const paramsValidation = validateAndSanitize(schema.params, req.params);
            if (!paramsValidation.success) {
                errors.push(...paramsValidation.errors.map(err => `Params: ${err}`));
            }
        }
        // Validate query parameters
        if (schema.query) {
            const queryValidation = validateAndSanitize(schema.query, req.query);
            if (!queryValidation.success) {
                errors.push(...queryValidation.errors.map(err => `Query: ${err}`));
            }
        }
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }
        next();
    };
}
/**
 * Common validation schemas
 */
export const validationSchemas = {
    // Authentication schemas
    login: {
        body: z.object({
            email: securitySchemas.email,
            password: z.string().min(1, 'Password required')
        })
    },
    register: {
        body: z.object({
            email: securitySchemas.email,
            password: securitySchemas.password,
            firstName: z.string().min(1).max(50),
            lastName: z.string().min(1).max(50),
            phoneNumber: securitySchemas.phoneNumber.optional(),
            role: z.enum(['admin', 'staff', 'marketing', 'lender', 'referrer', 'client']).optional()
        })
    },
    // Application schemas
    createApplication: {
        body: z.object({
            business: z.object({
                businessName: z.string().min(1).max(255),
                dbaName: z.string().max(255).optional(),
                ein: z.string().regex(/^\d{2}-\d{7}$/, 'Invalid EIN format').optional(),
                businessType: z.string().min(1).max(100),
                industry: z.string().min(1).max(100),
                yearsInBusiness: z.number().min(0).max(100),
                numberOfEmployees: z.number().min(0).max(100000),
                annualRevenue: z.number().min(0).max(1000000000)
            }),
            contact: z.object({
                firstName: z.string().min(1).max(50),
                lastName: z.string().min(1).max(50),
                email: securitySchemas.email,
                phoneNumber: securitySchemas.phoneNumber,
                title: z.string().max(100).optional()
            }),
            formFields: z.record(z.unknown()).optional()
        })
    },
    updateApplication: {
        params: z.object({
            id: securitySchemas.uuid
        }),
        body: z.object({
            status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'declined', 'funded']).optional(),
            stage: z.enum(['new', 'in_review', 'requires_docs', 'off_to_lender', 'accepted', 'denied']).optional(),
            notes: z.string().max(2000).optional()
        }).refine(data => Object.keys(data).length > 0, 'At least one field must be provided')
    },
    // Communications schemas
    sendEmail: {
        body: z.object({
            to: z.array(securitySchemas.email).min(1).max(50),
            subject: z.string().min(1).max(255),
            body: z.string().min(1).max(10000),
            templateId: z.string().max(100).optional(),
            attachments: z.array(z.object({
                filename: z.string().max(255),
                path: z.string().max(500)
            })).max(10).optional()
        })
    },
    sendSMS: {
        body: z.object({
            to: securitySchemas.phoneNumber,
            message: z.string().min(1).max(1600),
            templateId: z.string().max(100).optional()
        })
    },
    // Lender product schemas
    createLenderProduct: {
        body: z.object({
            name: z.string().min(1).max(255),
            lenderName: z.string().min(1).max(255),
            category: z.enum(['Business Line of Credit', 'Term Loan', 'Equipment Financing', 'Invoice Factoring', 'Purchase Order Financing', 'Working Capital', 'Asset-Based Lending', 'SBA Loan']),
            minAmount: z.number().min(0).max(100000000),
            maxAmount: z.number().min(0).max(100000000),
            minRate: z.number().min(0).max(100),
            maxRate: z.number().min(0).max(100),
            minTerm: z.number().min(0).max(600),
            maxTerm: z.number().min(0).max(600),
            country: z.enum(['US', 'CA', 'US/CA']),
            geography: z.string().max(255).optional(),
            industries: z.array(z.string().max(100)).max(50).optional(),
            requiredDocuments: z.array(z.string().max(100)).max(20).optional(),
            description: z.string().max(2000).optional()
        }).refine(data => data.minAmount <= data.maxAmount, 'Min amount must be less than or equal to max amount')
            .refine(data => data.minRate <= data.maxRate, 'Min rate must be less than or equal to max rate')
            .refine(data => data.minTerm <= data.maxTerm, 'Min term must be less than or equal to max term')
    },
    // Document schemas
    uploadDocument: {
        params: z.object({
            applicationId: securitySchemas.uuid
        }),
        body: z.object({
            category: z.enum([
                'bank_statements', 'tax_returns', 'financial_statements', 'business_license',
                'articles_of_incorporation', 'voided_check', 'equipment_quote', 'invoice_samples',
                'accounts_receivable_aging', 'business_plan', 'collateral_docs', 'personal_guarantee'
            ]).optional(),
            description: z.string().max(500).optional()
        })
    },
    // Marketing schemas
    createCampaign: {
        body: z.object({
            name: z.string().min(1).max(255),
            type: z.enum(['email', 'sms', 'social', 'display', 'search']),
            status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed']),
            budget: z.number().min(0).max(1000000).optional(),
            startDate: z.string().datetime().optional(),
            endDate: z.string().datetime().optional(),
            targetAudience: z.string().max(1000).optional(),
            content: z.record(z.unknown()).optional()
        })
    },
    // CRM schemas
    createContact: {
        body: z.object({
            firstName: z.string().min(1).max(50),
            lastName: z.string().min(1).max(50),
            email: securitySchemas.email,
            phoneNumber: securitySchemas.phoneNumber.optional(),
            company: z.string().max(255).optional(),
            title: z.string().max(100).optional(),
            notes: z.string().max(2000).optional(),
            tags: z.array(z.string().max(50)).max(20).optional()
        })
    },
    createCompany: {
        body: z.object({
            name: z.string().min(1).max(255),
            industry: z.string().max(100).optional(),
            website: z.string().url().max(255).optional(),
            phoneNumber: securitySchemas.phoneNumber.optional(),
            address: z.string().max(500).optional(),
            notes: z.string().max(2000).optional()
        })
    },
    // Risk assessment schemas
    riskAssessment: {
        body: z.object({
            applicationId: securitySchemas.uuid,
            factors: z.record(z.unknown()).optional(),
            riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional()
        })
    },
    // Generic ID parameter validation
    idParam: {
        params: z.object({
            id: securitySchemas.uuid
        })
    },
    // Pagination and filtering
    pagination: {
        query: z.object({
            page: z.string().regex(/^\d+$/).transform(Number).optional(),
            limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n <= 100, 'Limit cannot exceed 100').optional(),
            sort: z.string().max(50).optional(),
            order: z.enum(['asc', 'desc']).optional(),
            search: z.string().max(255).optional(),
            filter: z.string().max(500).optional()
        })
    }
};
/**
 * Sanitize request body to prevent XSS and injection attacks
 */
export const sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
};
/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
    if (typeof obj === 'string') {
        return obj.trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocols
            .replace(/on\w+="[^"]*"/gi, '') // Remove inline event handlers
            .substring(0, 10000); // Limit string length
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key.length <= 100) { // Limit key length
                sanitized[key] = sanitizeObject(value);
            }
        }
        return sanitized;
    }
    return obj;
}
