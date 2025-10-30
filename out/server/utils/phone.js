/**
 * Phone Number Validation Utility
 * Minimal implementation for compatibility
 */
/**
 * Validates and formats phone number to E.164 format
 * @param phoneNumber Raw phone number string
 * @param defaultCountry Default country code (optional)
 * @returns Formatted phone number in E.164 format
 */
export function validatePhoneNumber(phoneNumber, defaultCountry = 'US') {
    if (!phoneNumber) {
        throw new Error('Phone number is required');
    }
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    // If starts with 1 and has 11 digits, assume US number
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
    }
    // If has 10 digits, assume US number without country code
    if (digits.length === 10) {
        return `+1${digits}`;
    }
    // If already has country code
    if (digits.length > 10) {
        return `+${digits}`;
    }
    throw new Error('Invalid phone number format');
}
/**
 * Legacy function for backwards compatibility
 */
export function normalizePhone(raw) {
    return validatePhoneNumber(raw, 'US');
}
