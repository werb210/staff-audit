/**
 * Document Type Validation Middleware
 * 
 * Enforces canonical document_type enum in all upload operations
 * Prevents accidental drift and ensures schema safety
 */

import { Request, Response, NextFunction } from 'express';
import { DOCUMENT_TYPES, isValidDocumentType } from '../../shared/documentTypes';

export interface DocumentUploadRequest extends Request {
  body: {
    documentType?: string;
    document_type?: string;
    [key: string]: any;
  };
}

/**
 * Middleware to validate document type in upload requests
 */
export function validateDocumentType(
  req: DocumentUploadRequest, 
  res: Response, 
  next: NextFunction
): void {
  const documentType = req.body.documentType || req.body.document_type;
  
  // Allow requests without document type (will be handled elsewhere)
  if (!documentType) {
    return next();
  }
  
  // Validate against canonical enum
  if (!isValidDocumentType(documentType)) {
    console.error(`🚨 [DOC-TYPE-VALIDATION] Invalid document type: ${documentType}`);
    console.error(`🚨 [DOC-TYPE-VALIDATION] Valid types:`, DOCUMENT_TYPES);
    
    return res.status(400).json({
      success: false,
      error: 'Invalid document type',
      message: `Document type '${documentType}' is not supported. Must be one of: ${DOCUMENT_TYPES.join(', ')}`,
      validTypes: DOCUMENT_TYPES,
      receivedType: documentType
    });
  }
  
  console.log(`✅ [DOC-TYPE-VALIDATION] Valid document type: ${documentType}`);
  next();
}

/**
 * Strict validation that requires document type to be present
 */
export function requireDocumentType(
  req: DocumentUploadRequest, 
  res: Response, 
  next: NextFunction
): void {
  const documentType = req.body.documentType || req.body.document_type;
  
  if (!documentType) {
    return res.status(400).json({
      success: false,
      error: 'Missing document type',
      message: 'Document type is required for upload operations',
      validTypes: DOCUMENT_TYPES
    });
  }
  
  // Continue with standard validation
  validateDocumentType(req, res, next);
}

/**
 * Get all valid document types for API responses
 */
export function getValidDocumentTypes(): string[] {
  return [...DOCUMENT_TYPES];
}

/**
 * Normalize document type field names
 */
export function normalizeDocumentType(req: DocumentUploadRequest, res: Response, next: NextFunction): void {
  const documentType = req.body.documentType || req.body.document_type;
  
  if (documentType) {
    // Standardize to document_type field
    req.body.document_type = documentType;
    delete req.body.documentType;
  }
  
  next();
}