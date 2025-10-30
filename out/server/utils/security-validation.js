/**
 * Security Validation Utilities
 * Comprehensive input validation and sanitization for chatbot API
 */
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';
const SANITIZE_OPTIONS = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
};
function stripHtml(input) {
    return sanitizeHtml(input, SANITIZE_OPTIONS);
}
// Input length limits
export const INPUT_LIMITS = {
    SESSION_ID: 50,
    MESSAGE: 4000,
    NAME: 100,
    EMAIL: 254,
    PHONE: 20,
    ESCALATION_REASON: 50,
    ISSUE_TYPE: 50,
    DESCRIPTION: 2000
};
// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Validate and sanitize session ID
 */
export function validateSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Session ID must be a valid string');
    }
    const trimmed = sessionId.trim();
    if (trimmed.length === 0) {
        throw new Error('Session ID cannot be empty');
    }
    if (trimmed.length > INPUT_LIMITS.SESSION_ID) {
        throw new Error(`Session ID too long (max ${INPUT_LIMITS.SESSION_ID} characters)`);
    }
    // Check if it's a UUID or chat session ID format
    if (!UUID_REGEX.test(trimmed) && !trimmed.startsWith('chat_')) {
        throw new Error('Invalid session ID format');
    }
    return trimmed;
}
/**
 * Validate and sanitize chat message
 */
export function validateMessage(message) {
    if (!message || typeof message !== 'string') {
        throw new Error('Message must be a valid string');
    }
    const trimmed = message.trim();
    if (trimmed.length === 0) {
        throw new Error('Message cannot be empty');
    }
    if (trimmed.length > INPUT_LIMITS.MESSAGE) {
        throw new Error(`Message too long (max ${INPUT_LIMITS.MESSAGE} characters)`);
    }
    // Sanitize HTML/XSS
    const sanitized = stripHtml(trimmed);
    return sanitized;
}
/**
 * Validate and sanitize name
 */
export function validateName(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Name must be a valid string');
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        throw new Error('Name cannot be empty');
    }
    if (trimmed.length > INPUT_LIMITS.NAME) {
        throw new Error(`Name too long (max ${INPUT_LIMITS.NAME} characters)`);
    }
    // Remove HTML tags and sanitize
    const sanitized = stripHtml(trimmed);
    // Basic name validation (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-'.]+$/.test(sanitized)) {
        throw new Error('Name contains invalid characters');
    }
    return sanitized;
}
/**
 * Validate and sanitize email
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new Error('Email must be a valid string');
    }
    const trimmed = email.trim().toLowerCase();
    if (trimmed.length > INPUT_LIMITS.EMAIL) {
        throw new Error(`Email too long (max ${INPUT_LIMITS.EMAIL} characters)`);
    }
    if (!validator.isEmail(trimmed)) {
        throw new Error('Invalid email format');
    }
    return trimmed;
}
/**
 * Validate and sanitize phone number
 */
export function validatePhone(phone) {
    if (!phone)
        return null;
    if (typeof phone !== 'string') {
        throw new Error('Phone must be a valid string');
    }
    const trimmed = phone.trim();
    if (trimmed.length === 0)
        return null;
    if (trimmed.length > INPUT_LIMITS.PHONE) {
        throw new Error(`Phone too long (max ${INPUT_LIMITS.PHONE} characters)`);
    }
    // Basic phone validation (allow international format)
    if (!/^[\+]?[\d\s\-\(\)]+$/.test(trimmed)) {
        throw new Error('Invalid phone number format');
    }
    return trimmed;
}
/**
 * Validate language parameter
 */
export function validateLanguage(language) {
    if (!language || typeof language !== 'string') {
        return 'en'; // Default to English
    }
    const trimmed = language.trim().toLowerCase();
    // Only allow specific language codes
    const allowedLanguages = ['en', 'fr', 'es', 'de'];
    if (!allowedLanguages.includes(trimmed)) {
        return 'en'; // Default to English for unsupported languages
    }
    return trimmed;
}
/**
 * Validate consent flag
 */
export function validateConsent(consent) {
    return consent === true || consent === 'true';
}
/**
 * Validate escalation reason
 */
export function validateEscalationReason(reason) {
    if (!reason || typeof reason !== 'string') {
        return 'general_inquiry';
    }
    const trimmed = reason.trim();
    if (trimmed.length > INPUT_LIMITS.ESCALATION_REASON) {
        throw new Error(`Escalation reason too long (max ${INPUT_LIMITS.ESCALATION_REASON} characters)`);
    }
    // Only allow specific escalation reasons
    const allowedReasons = [
        'general_inquiry', 'technical_issue', 'billing_question',
        'account_problem', 'feature_request', 'complaint', 'staff_assistance'
    ];
    if (!allowedReasons.includes(trimmed)) {
        return 'general_inquiry';
    }
    return trimmed;
}
/**
 * Rate limiting key generator
 */
export function generateRateLimitKey(ip, endpoint) {
    return `rate_limit:${ip}:${endpoint}`;
}
/**
 * Sanitize generic text input
 */
export function sanitizeText(text, maxLength = 1000) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    const trimmed = text.trim();
    if (trimmed.length > maxLength) {
        throw new Error(`Text too long (max ${maxLength} characters)`);
    }
    // Remove HTML tags and sanitize
    return stripHtml(trimmed);
}
