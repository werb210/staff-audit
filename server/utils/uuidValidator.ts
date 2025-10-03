/**
 * UUID validation and normalization utilities
 * Handles both standard UUIDs and legacy ID formats
 */

// Standard UUID v4 pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Legacy timestamp-based ID pattern  
const LEGACY_ID_PATTERN = /^\d{13}_[a-zA-Z0-9]+$/;

// App prefixed ID patterns
const APP_PREFIX_PATTERNS = [
  /^app_prod_/,
  /^app_dev_/,
  /^app_fallback_/
];

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUUID(id: string): boolean {
  return UUID_PATTERN.test(id);
}

/**
 * Validates if a string is a valid legacy ID format
 */
export function isValidLegacyId(id: string): boolean {
  return LEGACY_ID_PATTERN.test(id);
}

/**
 * Checks if an ID has an app prefix
 */
export function hasAppPrefix(id: string): boolean {
  return APP_PREFIX_PATTERNS.some(pattern => pattern.test(id));
}

/**
 * Strips app prefixes from IDs
 */
export function stripAppPrefix(id: string): string {
  let cleanId = id;
  
  for (const pattern of APP_PREFIX_PATTERNS) {
    cleanId = cleanId.replace(pattern, '');
  }
  
  return cleanId;
}

/**
 * Validates and normalizes an application ID
 * Supports both UUID and legacy ID formats
 * Automatically strips app prefixes
 */
export function validateAndNormalizeUUID(id: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid application ID: must be a non-empty string');
  }

  // Strip any app prefixes first
  const cleanId = stripAppPrefix(id.trim());
  
  // Validate the cleaned ID
  if (isValidUUID(cleanId)) {
    return cleanId;
  }
  
  if (isValidLegacyId(cleanId)) {
    return cleanId;
  }
  
  // Check if it's a numeric ID (also valid)
  if (/^\d+$/.test(cleanId)) {
    return cleanId;
  }
  
  throw new Error(`Invalid application ID format: ${id} (cleaned: ${cleanId})`);
}

/**
 * Detects the format of an application ID
 */
export function detectIdFormat(id: string): 'uuid' | 'legacy' | 'numeric' | 'unknown' {
  const cleanId = stripAppPrefix(id);
  
  if (isValidUUID(cleanId)) {
    return 'uuid';
  }
  
  if (isValidLegacyId(cleanId)) {
    return 'legacy';
  }
  
  if (/^\d+$/.test(cleanId)) {
    return 'numeric';
  }
  
  return 'unknown';
}

/**
 * Formats an ID for logging with format detection
 */
export function formatIdForLogging(id: string): string {
  const cleanId = stripAppPrefix(id);
  const format = detectIdFormat(id);
  const hasPrefix = hasAppPrefix(id);
  
  return `${cleanId} (${format}${hasPrefix ? ', prefixed' : ''})`;
}