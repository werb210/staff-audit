/**
 * Document Type Validation API Routes
 * 
 * Provides endpoints for document type validation and enum access
 * Used by admin panels, CI tests, and frontend validation
 */

import { Router } from 'express';
import { Request, Response } from 'express';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, DOCUMENT_CATEGORIES, ENUM_VERSION, isValidDocumentType } from '../../shared/documentTypes';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/document-validation/types
 * Returns all valid document types
 */
router.get('/types', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Document types retrieved successfully',
    data: {
      types: DOCUMENT_TYPES,
      count: DOCUMENT_TYPES.length,
      version: ENUM_VERSION
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/document-validation/labels
 * Returns document types with human-readable labels
 */
router.get('/labels', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Document type labels retrieved successfully',
    data: {
      labels: DOCUMENT_TYPE_LABELS,
      count: Object.keys(DOCUMENT_TYPE_LABELS).length,
      version: ENUM_VERSION
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/document-validation/categories
 * Returns document types grouped by categories
 */
router.get('/categories', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Document type categories retrieved successfully',
    data: {
      categories: DOCUMENT_CATEGORIES,
      version: ENUM_VERSION
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/document-validation/validate
 * Validates a document type
 */
router.post('/validate', (req: Request, res: Response) => {
  const { documentType, document_type } = req.body;
  const typeToValidate = documentType || document_type;
  
  if (!typeToValidate) {
    return res.status(400).json({
      success: false,
      error: 'Missing document type',
      message: 'Please provide documentType or document_type field'
    });
  }
  
  const isValid = isValidDocumentType(typeToValidate);
  
  res.json({
    success: true,
    message: `Document type validation ${isValid ? 'passed' : 'failed'}`,
    data: {
      documentType: typeToValidate,
      isValid,
      validTypes: isValid ? undefined : DOCUMENT_TYPES,
      version: ENUM_VERSION
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/document-validation/db-compare
 * Compares canonical enum with database enum (for CI testing)
 */
router.get('/db-compare', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [DOC-VALIDATION] Comparing canonical enum with database...');
    
    // Get database enum values
    const dbEnumResult = await db.execute(
      sql`SELECT unnest(enum_range(NULL::document_type)) AS document_type_value ORDER BY document_type_value`
    );
    
    const dbTypes = dbEnumResult.rows.map((row: any) => row.document_type_value).sort();
    const canonicalTypes = [...DOCUMENT_TYPES].sort();
    
    // Compare arrays
    const dbSet = new Set(dbTypes);
    const canonicalSet = new Set(canonicalTypes);
    
    const onlyInDb = dbTypes.filter(type => !canonicalSet.has(type));
    const onlyInCanonical = canonicalTypes.filter(type => !dbSet.has(type));
    const inBoth = canonicalTypes.filter(type => dbSet.has(type));
    
    const isMatch = onlyInDb.length === 0 && onlyInCanonical.length === 0;
    
    console.log(`🔍 [DOC-VALIDATION] Database has ${dbTypes.length} types, canonical has ${canonicalTypes.length} types`);
    console.log(`🔍 [DOC-VALIDATION] Match status: ${isMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    
    res.json({
      success: true,
      message: `Database comparison ${isMatch ? 'passed' : 'failed'}`,
      data: {
        isMatch,
        database: {
          count: dbTypes.length,
          types: dbTypes
        },
        canonical: {
          count: canonicalTypes.length,
          types: canonicalTypes,
          version: ENUM_VERSION
        },
        differences: {
          onlyInDatabase: onlyInDb,
          onlyInCanonical: onlyInCanonical,
          inBoth: inBoth.length
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error('🚨 [DOC-VALIDATION] Database comparison failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database comparison failed',
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * GET /api/document-validation/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Document validation service is healthy',
    data: {
      enumCount: DOCUMENT_TYPES.length,
      version: ENUM_VERSION,
      status: 'operational'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;