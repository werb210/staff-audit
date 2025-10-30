import crypto from 'crypto';
// PII patterns to scrub from logs and responses
const PII_PATTERNS = [
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // Phone numbers (various formats)
    /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    // SSN patterns
    /\b\d{3}-\d{2}-\d{4}\b/g,
    /\b\d{9}\b/g,
    // EIN patterns
    /\b\d{2}-\d{7}\b/g,
    // Credit card patterns (basic)
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    // Bank account patterns
    /\b\d{8,12}\b/g,
];
export function scrubPII(text) {
    if (!text || typeof text !== 'string')
        return text;
    let scrubbed = text;
    PII_PATTERNS.forEach(pattern => {
        scrubbed = scrubbed.replace(pattern, '[REDACTED]');
    });
    return scrubbed;
}
export function scrubObject(obj) {
    if (!obj)
        return obj;
    if (typeof obj === 'string') {
        return scrubPII(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(scrubObject);
    }
    if (typeof obj === 'object') {
        const scrubbed = {};
        for (const [key, value] of Object.entries(obj)) {
            // Additional scrubbing for known sensitive fields
            if (['email', 'phone', 'ssn', 'ein', 'account_number', 'routing_number'].includes(key.toLowerCase())) {
                scrubbed[key] = '[REDACTED]';
            }
            else {
                scrubbed[key] = scrubObject(value);
            }
        }
        return scrubbed;
    }
    return obj;
}
// Prompt injection defenses
export function sanitizePromptInput(input) {
    if (!input || typeof input !== 'string')
        return input;
    // Remove potential prompt injection attempts
    const dangerous = [
        /ignore\s+previous\s+instructions?/gi,
        /disregard\s+all\s+previous\s+instructions?/gi,
        /forget\s+everything\s+above/gi,
        /new\s+instructions?:/gi,
        /system\s*:/gi,
        /assistant\s*:/gi,
        /human\s*:/gi,
        /<\s*script\s*>/gi,
        /javascript\s*:/gi,
        /data\s*:/gi,
    ];
    let sanitized = input;
    dangerous.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[FILTERED]');
    });
    // Limit length to prevent token exhaustion attacks
    if (sanitized.length > 10000) {
        sanitized = sanitized.substring(0, 10000) + '[TRUNCATED]';
    }
    return sanitized;
}
// URL whitelist for fetching external content
const ALLOWED_DOMAINS = [
    'api.openai.com',
    'storage.googleapis.com',
    'docs.google.com',
    // Add your allowed domains here
];
export function isAllowedURL(url) {
    try {
        const parsed = new URL(url);
        return ALLOWED_DOMAINS.includes(parsed.hostname);
    }
    catch {
        return false;
    }
}
// Hallucination guard - require citations for claims
export function validateCitations(text, sources) {
    const warnings = [];
    let score = 1.0;
    // Look for numeric claims without citations
    const numericClaims = text.match(/\$[\d,]+|\d+\%|\d+\.\d+|\d{4}-\d{2}-\d{2}/g) || [];
    const citationMarkers = text.match(/\[source:\s*[^\]]+\]/gi) || [];
    if (numericClaims.length > 0 && citationMarkers.length === 0) {
        warnings.push('Numeric claims found without source citations');
        score -= 0.3;
    }
    // Check if all citations reference provided sources
    citationMarkers.forEach(marker => {
        const sourceName = marker.match(/\[source:\s*([^\]]+)\]/i)?.[1];
        if (sourceName && !sources.some(s => s.toLowerCase().includes(sourceName.toLowerCase()))) {
            warnings.push(`Citation references unknown source: ${sourceName}`);
            score -= 0.2;
        }
    });
    return {
        valid: warnings.length === 0,
        warnings,
        score: Math.max(0, score)
    };
}
// Generate request signature for caching
export function generateCacheKey(input, model, promptVersion) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(input));
    hash.update(model);
    hash.update(promptVersion);
    return hash.digest('hex').substring(0, 16);
}
// Rate limiting helpers
export function getRateLimitKey(userId, action) {
    const window = Math.floor(Date.now() / (15 * 60 * 1000)); // 15-minute windows
    return `rate_limit:${userId}:${action}:${window}`;
}
export const RATE_LIMITS = {
    'scan_docs': 20, // 20 per 15 minutes
    'ocr': 10, // 10 per 15 minutes (expensive)
    'validate': 30, // 30 per 15 minutes
    'credit_summary': 5, // 5 per 15 minutes (very expensive)
    'compose_email': 50, // 50 per 15 minutes
    'aml': 15, // 15 per 15 minutes
    'default': 100 // Default limit for other actions
};
