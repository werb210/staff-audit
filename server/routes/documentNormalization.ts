/**
 * Document Normalization API Routes
 * 
 * Provides endpoints for normalizing document requirements across lender products
 */

import { Router } from "express";
import { db } from "../db";
// import { lenderProductsDisabled } from "../../shared/schema"; // Temporarily disabled during schema migration
import { isNull, eq } from "drizzle-orm";
import { bulkNormalizeLenderProducts, normalizeDocumentRequirements, CANONICAL_DOCUMENT_TYPES, LEGACY_DOCUMENT_MAPPING } from '../utils/documentNormalization';

const router = Router();

/**
 * POST /api/document-normalization/bulk-normalize
 * Bulk normalize all lender products document requirements
 */
router.post("/bulk-normalize", async (req: any, res: any) => {
  try {
    console.log("🚀 [DOC-NORMALIZE] Starting bulk normalization process...");
    
    const results = await bulkNormalizeLenderProducts(db, lenderProductsDisabled);
    
    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error("❌ [DOC-NORMALIZE] Bulk normalization failed:", error);
    res.status(500).json({
      success: false,
      error: "Bulk normalization failed",
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

/**
 * GET /api/document-normalization/mappings
 * Returns the legacy to canonical document type mappings
 */
router.get("/mappings", (req: any, res: any) => {
  res.json({
    success: true,
    canonical_types: CANONICAL_DOCUMENT_TYPES,
    legacy_mappings: LEGACY_DOCUMENT_MAPPING,
    total_canonical: CANONICAL_DOCUMENT_TYPES.length,
    total_mappings: Object.keys(LEGACY_DOCUMENT_MAPPING).length
  });
});

/**
 * POST /api/document-normalization/validate
 * Validates document requirements against canonical types
 */
router.post("/validate", (req: any, res: any) => {
  try {
    const { doc_requirements } = req.body;
    
    if (!doc_requirements) {
      return res.status(400).json({
        success: false,
        error: "doc_requirements field is required"
      });
    }
    
    const normalization = normalizeDocumentRequirements(doc_requirements);
    
    res.json({
      success: true,
      input: doc_requirements,
      normalized: normalization.normalized,
      raw: normalization.raw,
      mappings: normalization.mappings,
      validation: {
        total_input: normalization.raw.length,
        normalized_count: normalization.normalized.length,
        mapped_count: Object.keys(normalization.mappings).length,
        unmapped: normalization.raw.filter(raw => 
          !normalization.normalized.includes(raw as any) && 
          !normalization.mappings[raw]
        )
      }
    });
    
  } catch (error: unknown) {
    console.error("❌ [DOC-NORMALIZE] Validation failed:", error);
    res.status(500).json({
      success: false,
      error: "Validation failed",
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

/**
 * GET /api/document-normalization/status
 * Returns normalization status for all lender products
 */
router.get("/status", async (req: any, res: any) => {
  try {
    console.log("📊 [DOC-NORMALIZE] Checking normalization status...");
    
    // Lender products temporarily disabled during schema migration
    console.log('Lender products temporarily disabled during schema migration');
    const products = [];
    
    const status = {
      total_products: products.length,
      normalized: 0,
      needs_normalization: 0,
      has_raw_backup: 0,
      unmapped_types: new Set<string>()
    };
    
    for (const product of products) {
      if (product.raw_doc_requirements) {
        status.has_raw_backup++;
      }
      
      const normalization = normalizeDocumentRequirements(product.doc_requirements);
      
      if (normalization.normalized.length > 0 && Object.keys(normalization.mappings).length === 0) {
        status.normalized++;
      } else {
        status.needs_normalization++;
        
        // Track unmapped types
        normalization.raw.forEach(raw => {
          if (!normalization.normalized.includes(raw as any) && !normalization.mappings[raw]) {
            status.unmapped_types.add(raw);
          }
        });
      }
    }
    
    res.json({
      success: true,
      status: {
        ...status,
        unmapped_types: Array.from(status.unmapped_types)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error("❌ [DOC-NORMALIZE] Status check failed:", error);
    res.status(500).json({
      success: false,
      error: "Status check failed",
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

export { router as documentNormalizationRoutes };