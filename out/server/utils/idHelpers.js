/**
 * 🔧 UUID Normalization Utilities
 * Auto-strips any prefix server-side to prevent future breakage
 */
/**
 * Normalizes any prefixed ID to raw UUID format
 * Strips app_prod_, app_dev_, app_fallback_ prefixes
 */
export function normalizeToUUID(applicationId) {
    return applicationId.replace(/^app_(fallback|prod|dev)_/, "");
}
/**
 * Validates UUID format using RFC 4122 standard
 */
export function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
/**
 * Combined normalize and validate function
 * Returns normalized UUID if valid, throws error if invalid
 */
export function validateAndNormalizeUUID(applicationId) {
    const rawId = normalizeToUUID(applicationId);
    if (!isValidUUID(rawId)) {
        throw new Error("Invalid UUID format");
    }
    return rawId;
}
// Legacy functions for backward compatibility
export function stripAppProdPrefix(id) {
    return normalizeToUUID(id);
}
export function addAppProdPrefix(id) {
    return `app_prod_${id}`;
}
