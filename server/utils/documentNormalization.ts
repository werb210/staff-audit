/**
 * Document Requirements Normalization Utility
 * 
 * Cleans and normalizes document requirements across all lender products
 * ensuring consistent naming and dual-field support for backward compatibility
 */

export const CANONICAL_DOCUMENT_TYPES = [
  'bank_statements',
  'financial_statements', 
  'tax_returns',
  'balance_sheet',
  'cash_flow_statement',
  'profit_loss_statement',
  'accounts_receivable',
  'accounts_payable',
  'personal_financial_statement',
  'business_plan',
  'equipment_quote',
  'sample_invoices',
  'supplier_agreement',
  'void_cheque',
  'driver_license',
  'business_license'
] as const;

export type CanonicalDocumentType = typeof CANONICAL_DOCUMENT_TYPES[number];

/**
 * Legacy to canonical document type mapping
 */
export const LEGACY_DOCUMENT_MAPPING: Record<string, CanonicalDocumentType> = {
  // Legacy format mappings
  'a/r_(accounts_receivable)': 'accounts_receivable',
  'a/p_(accounts_payable)': 'accounts_payable',
  'void_pad': 'void_cheque',
  'drivers_license_front_back': 'driver_license',
  
  // Additional common variants
  'sample_invoices': 'sample_invoices',
  'invoices': 'sample_invoices',
  'invoice_samples': 'sample_invoices'
};

/**
 * Normalizes a single document requirement to canonical format
 */
export function normalizeDocumentType(docType: string): CanonicalDocumentType | null {
  if (!docType || typeof docType !== 'string') {
    return null;
  }

  const cleaned = docType.trim().toLowerCase();
  
  // Check if it's already canonical
  if (CANONICAL_DOCUMENT_TYPES.includes(cleaned as CanonicalDocumentType)) {
    return cleaned as CanonicalDocumentType;
  }
  
  // Check legacy mapping
  if (LEGACY_DOCUMENT_MAPPING[cleaned]) {
    return LEGACY_DOCUMENT_MAPPING[cleaned];
  }
  
  // Log unmapped types for review
  console.warn(`🔍 [DOC-NORMALIZE] Unmapped document type: "${docType}"`);
  return null;
}

/**
 * Normalizes an array of document requirements
 */
export function normalizeDocumentRequirements(requirements: any): {
  normalized: CanonicalDocumentType[];
  raw: string[];
  mappings: Record<string, string>;
} {
  const raw: string[] = [];
  const normalized: CanonicalDocumentType[] = [];
  const mappings: Record<string, string> = {};
  
  // Handle different input formats
  let docArray: string[] = [];
  
  if (Array.isArray(requirements)) {
    docArray = requirements.filter(req => typeof req === 'string');
  } else if (typeof requirements === 'string') {
    try {
      // Try parsing as JSON array
      const parsed = JSON.parse(requirements);
      if (Array.isArray(parsed)) {
        docArray = parsed.filter(req => typeof req === 'string');
      } else {
        docArray = [requirements];
      }
    } catch {
      docArray = [requirements];
    }
  }
  
  // Process each document type
  for (const docType of docArray) {
    if (!docType) continue;
    
    raw.push(docType);
    const normalizedType = normalizeDocumentType(docType);
    
    if (normalizedType) {
      if (!normalized.includes(normalizedType)) {
        normalized.push(normalizedType);
      }
      
      // Track mapping if it changed
      if (docType !== normalizedType) {
        mappings[docType] = normalizedType;
      }
    }
  }
  
  return {
    normalized: normalized.sort(),
    raw,
    mappings
  };
}

/**
 * Validates if a document type is canonical
 */
export function isCanonicalDocumentType(docType: string): docType is CanonicalDocumentType {
  return CANONICAL_DOCUMENT_TYPES.includes(docType as CanonicalDocumentType);
}

/**
 * Gets all legacy variants that map to a canonical type
 */
export function getLegacyVariants(canonicalType: CanonicalDocumentType): string[] {
  return Object.entries(LEGACY_DOCUMENT_MAPPING)
    .filter(([_, canonical]) => canonical === canonicalType)
    .map(([legacy, _]) => legacy);
}

/**
 * Bulk normalize all lender products document requirements
 */
export async function bulkNormalizeLenderProducts(db: any, lenderProducts: any) {
  const results = {
    processed: 0,
    updated: 0,
    errors: 0,
    mappings: {} as Record<string, Record<string, string>>
  };
  
  try {
    console.log('📋 [DOC-NORMALIZE] Starting bulk normalization of lender products...');
    
    // Get all products with doc_requirements
    const products = await db
      .select()
      .from(lenderProducts)
      .where(isNull(lenderProducts.deletedAt));
    
    console.log(`📊 [DOC-NORMALIZE] Found ${products.length} products to process`);
    
    for (const product of products) {
      results.processed++;
      
      try {
        const normalization = normalizeDocumentRequirements(product.docRequirements);
        
        // Only update if there are changes
        if (normalization.normalized.length > 0 || Object.keys(normalization.mappings).length > 0) {
          await db
            .update(lenderProducts)
            .set({
              docRequirements: normalization.normalized,
              rawDocRequirements: normalization.raw,
              updatedAt: new Date()
            })
            .where(eq(lenderProducts.id, product.id));
          
          results.updated++;
          
          if (Object.keys(normalization.mappings).length > 0) {
            results.mappings[product.id] = normalization.mappings;
            console.log(`🔄 [DOC-NORMALIZE] ${product.name}: ${Object.keys(normalization.mappings).length} mappings applied`);
          }
        }
        
      } catch (error: unknown) {
        results.errors++;
        console.error(`❌ [DOC-NORMALIZE] Error processing ${product.name}:`, error);
      }
    }
    
    console.log(`✅ [DOC-NORMALIZE] Bulk normalization complete:`, results);
    return results;
    
  } catch (error: unknown) {
    console.error('❌ [DOC-NORMALIZE] Bulk normalization failed:', error);
    throw error;
  }
}