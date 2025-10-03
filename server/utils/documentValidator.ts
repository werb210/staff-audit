// Document validation utility for staff application
import type { documents } from '../../shared/schema';

type Document = typeof documents.$inferSelect;

/**
 * Validates if all required documents are uploaded for an application
 * @param appDocs - Array of uploaded documents for the application
 * @param requiredTypes - Array of required document types from lender product
 * @returns Array of missing document types
 */
export function validateDocuments(appDocs: Document[], requiredTypes: string[]): string[] {
  const uploaded = appDocs.map(d => d.documentType);
  return requiredTypes.filter(type => !uploaded.includes(type));
}

/**
 * Checks if application has all required documents
 * @param appDocs - Array of uploaded documents for the application
 * @param requiredTypes - Array of required document types from lender product
 * @returns Boolean indicating if all required documents are present
 */
export function hasAllRequiredDocuments(appDocs: Document[], requiredTypes: string[]): boolean {
  const missing = validateDocuments(appDocs, requiredTypes);
  return missing.length === 0;
}

/**
 * Gets formatted validation status with missing document details
 * @param appDocs - Array of uploaded documents for the application
 * @param requiredTypes - Array of required document types from lender product
 * @returns Validation status object
 */
export function getDocumentValidationStatus(appDocs: Document[], requiredTypes: string[]) {
  const missing = validateDocuments(appDocs, requiredTypes);
  const uploaded = appDocs.map(d => d.documentType);
  
  return {
    isValid: missing.length === 0,
    totalRequired: requiredTypes.length,
    totalUploaded: uploaded.length,
    missingDocuments: missing,
    uploadedDocuments: uploaded,
    completionRate: requiredTypes.length > 0 ? 
      ((requiredTypes.length - missing.length) / requiredTypes.length) * 100 : 100
  };
}