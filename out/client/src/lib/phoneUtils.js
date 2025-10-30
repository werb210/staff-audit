/**
 * Comprehensive phone number formatting utilities for 2FA verification
 * Ensures all phone numbers follow international standards
 */
// International phone number regex for validation
const INTERNATIONAL_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
// Common country codes and their expected lengths
const COUNTRY_PHONE_PATTERNS = {
    // North America (US, Canada)
    "+1": { minLength: 11, maxLength: 11, format: "+1XXXXXXXXXX" },
    // UK
    "+44": { minLength: 11, maxLength: 13, format: "+44XXXXXXXXXX" },
    // Germany
    "+49": { minLength: 11, maxLength: 12, format: "+49XXXXXXXXXX" },
    // France
    "+33": { minLength: 11, maxLength: 11, format: "+33XXXXXXXXX" },
    // Australia
    "+61": { minLength: 11, maxLength: 11, format: "+61XXXXXXXXX" },
    // Japan
    "+81": { minLength: 11, maxLength: 12, format: "+81XXXXXXXXXX" },
    // India
    "+91": { minLength: 13, maxLength: 13, format: "+91XXXXXXXXXX" },
};
/**
 * Formats a phone number to international standard
 * @param value - Raw phone number input
 * @param defaultCountryCode - Default country code if none provided (default: +1)
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (value, defaultCountryCode = "+1") => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, "");
    // If empty, return empty
    if (!cleaned)
        return "";
    // If it doesn't start with +, add default country code
    if (!cleaned.startsWith("+")) {
        // If it starts with a digit, assume it needs country code
        if (/^\d/.test(cleaned)) {
            // For US/Canada numbers starting with 1, don't double-add
            if (defaultCountryCode === "+1" &&
                cleaned.startsWith("1") &&
                cleaned.length === 11) {
                return "+" + cleaned;
            }
            return defaultCountryCode + cleaned;
        }
        return defaultCountryCode + cleaned;
    }
    return cleaned;
};
/**
 * Validates if a phone number is in correct international format for 2FA
 * @param phone - Phone number to validate
 * @returns true if valid for 2FA
 */
export const isValidPhoneNumber = (phone) => {
    if (!phone)
        return false;
    // Must match international format
    if (!INTERNATIONAL_PHONE_REGEX.test(phone))
        return false;
    // Check against known country patterns
    for (const [countryCode, pattern] of Object.entries(COUNTRY_PHONE_PATTERNS)) {
        if (phone.startsWith(countryCode)) {
            const phoneLength = phone.length;
            return (phoneLength >= pattern.minLength && phoneLength <= pattern.maxLength);
        }
    }
    // For unknown country codes, accept if it matches basic international format
    return phone.length >= 8 && phone.length <= 16;
};
/**
 * Provides real-time formatting hints for phone input
 * @param phone - Current phone number value
 * @returns Formatting hint or validation message
 */
export const getPhoneFormatHint = (phone) => {
    if (!phone)
        return "Enter phone number in international format (e.g., +1234567890)";
    if (!phone.startsWith("+")) {
        return "Phone numbers must start with + and country code (e.g., +1 for US/Canada)";
    }
    // Find matching country pattern
    for (const [countryCode, pattern] of Object.entries(COUNTRY_PHONE_PATTERNS)) {
        if (phone.startsWith(countryCode)) {
            if (phone.length < pattern.minLength) {
                return `${countryCode} numbers need ${pattern.minLength - phone.length} more digits`;
            }
            if (phone.length > pattern.maxLength) {
                return `${countryCode} numbers should be ${pattern.maxLength} digits maximum`;
            }
            if (isValidPhoneNumber(phone)) {
                return "✓ Valid phone number for 2FA";
            }
        }
    }
    if (isValidPhoneNumber(phone)) {
        return "✓ Valid international phone number";
    }
    return "Please use international format: +[country code][phone number]";
};
/**
 * Normalizes phone number for database storage
 * Ensures consistent format for 2FA verification
 * @param phone - Phone number to normalize
 * @returns Normalized phone number
 */
export const normalizePhoneNumber = (phone) => {
    const formatted = formatPhoneNumber(phone);
    return isValidPhoneNumber(formatted) ? formatted : "";
};
/**
 * Format phone number for display with proper spacing
 * @param phone - International phone number
 * @returns Formatted display string
 */
export const formatPhoneForDisplay = (phone) => {
    if (!phone || !isValidPhoneNumber(phone))
        return phone;
    // Format common patterns for better readability
    if (phone.startsWith("+1") && phone.length === 12) {
        // US/Canada: +1 (XXX) XXX-XXXX
        const digits = phone.slice(2);
        return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (phone.startsWith("+44") && phone.length >= 11) {
        // UK: +44 XXXX XXX XXX
        const digits = phone.slice(3);
        return `+44 ${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    // Default: add spaces after country code
    const match = phone.match(/^(\+\d{1,3})(\d+)$/);
    if (match) {
        const [, countryCode, number] = match;
        // Add space every 3-4 digits for readability
        const spacedNumber = number.replace(/(\d{3,4})/g, "$1 ").trim();
        return `${countryCode} ${spacedNumber}`;
    }
    return phone;
};
/**
 * Extract country code from phone number
 * @param phone - International phone number
 * @returns Country code (e.g., '+1', '+44')
 */
export const extractCountryCode = (phone) => {
    if (!phone.startsWith("+"))
        return "";
    // Try known country codes first
    for (const countryCode of Object.keys(COUNTRY_PHONE_PATTERNS)) {
        if (phone.startsWith(countryCode))
            return countryCode;
    }
    // Extract up to 4 digits after +
    const match = phone.match(/^(\+\d{1,4})/);
    return match ? match[1] : "";
};
/**
 * Format phone number to international standard for dialer UI
 * Alias for formatPhoneNumber for compatibility with new dialer system
 * @param value - Raw phone number input
 * @returns Formatted international phone number
 */
export const formatPhoneIntl = (value) => {
    return formatPhoneNumber(value);
};
/**
 * Format phone number for international display (new dialer system)
 * @param value - Raw phone number input
 * @returns Formatted international phone number
 */
export const formatIntl = (value) => {
    return formatPhoneNumber(value);
};
/**
 * Normalize phone number to E.164 format
 * @param value - Raw phone number input
 * @returns E.164 formatted phone number or null if invalid
 */
export const normalizeE164 = (value) => {
    const formatted = formatPhoneNumber(value);
    return isValidPhoneNumber(formatted) ? formatted : null;
};
