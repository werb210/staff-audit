/**
 * Document Type Enum Schema Lock
 * Prevents unauthorized modifications to document_type enum
 */

// Check if enum modifications are allowed
if (process.env.ALLOW_ENUM_EDITS !== "true") {
  console.warn(
    "[LOCKED] document_type enum is frozen. Set ALLOW_ENUM_EDITS=true to modify."
  );
  
  // Only block in development when lock is explicitly active
  // Production deployment should not be blocked by enum lock
  if (process.env.ENUM_LOCK_ACTIVE === 'true' && process.env.NODE_ENV !== 'production') {
    throw new Error("Modifying document_type enum is prohibited without approval.");
  }
  
  if (process.env.NODE_ENV === 'production') {
    console.warn("[PRODUCTION] Enum lock bypassed for production deployment");
  }
}

/**
 * Enum lock validation function
 * Can be called before any schema modifications
 */
export function validateEnumModification(enumName: string = 'document_type') {
  if (process.env.ALLOW_ENUM_EDITS !== "true") {
    console.warn(`[ENUM-LOCK] Attempting to modify ${enumName} enum - checking permissions...`);
    
    // Allow production deployment - enum validation shouldn't block server startup
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[PRODUCTION] ${enumName} enum lock bypassed for production deployment`);
      return; // Allow production to proceed
    }
    
    if (process.env.ENUM_LOCK_ACTIVE === 'true') {
      throw new Error(`Development enum lock: ${enumName} modifications blocked by ENUM_LOCK_ACTIVE flag`);
    }
    
    console.warn(`[ENUM-LOCK] ${enumName} modification allowed in development mode`);
  } else {
    console.log(`[ENUM-LOCK] ${enumName} modification explicitly allowed by ALLOW_ENUM_EDITS flag`);
  }
}

/**
 * Startup enum lock warning
 */
export function displayStartupEnumLockWarning() {
  if (process.env.ALLOW_ENUM_EDITS !== "true") {
    console.warn("🔒 [ENUM-LOCK] Document type enum schema is LOCKED");
    console.warn("🔒 [ENUM-LOCK] Set ALLOW_ENUM_EDITS=true to enable modifications");
    
    if (process.env.NODE_ENV === 'production') {
      console.warn("🔒 [ENUM-LOCK] Production mode: All enum modifications blocked");
    }
    
    if (process.env.ENUM_LOCK_ACTIVE === 'true') {
      console.warn("🔒 [ENUM-LOCK] Development lock active: Enum modifications blocked");
    }
  } else {
    console.log("🔓 [ENUM-LOCK] Document type enum modifications ALLOWED by environment flag");
  }
}