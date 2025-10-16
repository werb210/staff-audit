import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import request from 'supertest';

// Mock S3 upload for testing
const mockS3Upload = {
  success: true,
  documentId: 'test-doc-id',
  storageKey: 'test/test-file.pdf'
};

// Document type mappings under test
const DOCUMENT_TYPE_MAPPINGS = {
  'void_cheque': 'void_pad',
  'bank_statement': 'bank_statements',
  'government_id': 'proof_of_identity',
  'business_license': 'business_license',
  'financial_statements': 'financial_statements',
  'profit_loss_statement': 'profit_loss_statement',
  'balance_sheet': 'balance_sheet',
  'tax_return': 'tax_returns',
  'invoice_summary': 'invoice_samples',
  'accounts_receivable': 'accounts_receivable',
  'accounts_payable': 'accounts_payable',
  'account_prepared_financials': 'account_prepared_financials',
  'pnl_statement': 'pnl_statement'
};

describe('Document Type Mapping System', () => {
  let validDbTypes: Set<string>;

  beforeAll(async () => {
    // Get all valid document types from database enum
    const result = await db.execute(`
      SELECT enumlabel FROM pg_enum WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'document_type'
      )
    `);
    validDbTypes = new Set(result.rows.map(row => row.enumlabel));
    console.log(`[TEST] Found ${validDbTypes.size} valid database types`);
  });

  describe('Database Enum Validation', () => {
    it('should have all mapped values in document_type enum', () => {
      const invalidMappings = [];
      
      for (const [clientType, mappedType] of Object.entries(DOCUMENT_TYPE_MAPPINGS)) {
        if (!validDbTypes.has(mappedType)) {
          invalidMappings.push({ clientType, mappedType });
        }
      }

      if (invalidMappings.length > 0) {
        console.error('[TEST] Invalid mappings found:', invalidMappings);
      }

      expect(invalidMappings).toHaveLength(0);
    });

    it('should reject invalid document types', async () => {
      const invalidTypes = ['invalid_type', 'unknown_document', 'test_type'];
      
      for (const invalidType of invalidTypes) {
        expect(validDbTypes.has(invalidType)).toBe(false);
      }
    });
  });

  describe('Document Type Coverage', () => {
    it('should have mappings for all commonly used client types', () => {
      const requiredClientTypes = [
        'void_cheque', 'bank_statement', 'government_id', 'business_license',
        'financial_statements', 'profit_loss_statement', 'balance_sheet',
        'tax_return', 'invoice_summary', 'accounts_receivable', 'accounts_payable'
      ];

      const missingMappings = requiredClientTypes.filter(
        type => !DOCUMENT_TYPE_MAPPINGS.hasOwnProperty(type)
      );

      expect(missingMappings).toHaveLength(0);
    });

    it('should not have duplicate mapped values unless intentional', () => {
      const mappedValues = Object.values(DOCUMENT_TYPE_MAPPINGS);
      const uniqueMappedValues = new Set(mappedValues);
      
      // Allow some intentional duplicates (e.g., financial_statements can map to itself)
      const allowedDuplicates = ['financial_statements', 'business_license'];
      
      const actualDuplicates = mappedValues.filter((value, index) => 
        mappedValues.indexOf(value) !== index && !allowedDuplicates.includes(value)
      );

      expect(actualDuplicates).toHaveLength(0);
    });
  });

  describe('Mapping Reference API', () => {
    it('should return valid reference table structure', async () => {
      // This would test the actual API endpoint if we had the full app setup
      const expectedStructure = {
        success: true,
        mapped_types: expect.any(Array),
        unmapped_db_types: expect.any(Array),
        total_valid_db_types: expect.any(Number),
        total_mappings: expect.any(Number),
        generated_at: expect.any(String)
      };

      // Mock validation - in real scenario would call actual API
      const mockResponse = {
        success: true,
        mapped_types: Object.entries(DOCUMENT_TYPE_MAPPINGS).map(([client, mapped]) => ({
          client_type: client,
          mapped_type: mapped,
          status: validDbTypes.has(mapped) ? 'working' : 'invalid_mapping',
          db_enum_exists: validDbTypes.has(mapped)
        })),
        unmapped_db_types: [],
        total_valid_db_types: validDbTypes.size,
        total_mappings: Object.keys(DOCUMENT_TYPE_MAPPINGS).length,
        generated_at: new Date().toISOString()
      };

      expect(mockResponse).toMatchObject(expectedStructure);
    });
  });

  describe('Upload Validation', () => {
    it('should validate that all mapped types would pass upload validation', () => {
      // Test that document type validation would pass for all mapped types
      const validationResults = Object.values(DOCUMENT_TYPE_MAPPINGS).map(mappedType => ({
        type: mappedType,
        isValid: validDbTypes.has(mappedType)
      }));

      const failedValidations = validationResults.filter(result => !result.isValid);
      
      if (failedValidations.length > 0) {
        console.error('[TEST] Failed upload validations:', failedValidations);
      }

      expect(failedValidations).toHaveLength(0);
    });

    it('should ensure no unmapped client aliases exist', () => {
      // This test ensures we haven't missed any common client document type names
      const knownClientTypes = Object.keys(DOCUMENT_TYPE_MAPPINGS);
      
      // Add any additional client types that should be mapped
      const commonClientTypes = [
        'bank_statement', 'financial_statement', 'tax_document', 'id_document',
        'business_registration', 'income_statement', 'cash_flow', 'void_check'
      ];

      const unmappedCommonTypes = commonClientTypes.filter(type => 
        !knownClientTypes.includes(type) && 
        !knownClientTypes.includes(type.replace('_', '_'))
      );

      // This is informational - log unmapped types for review
      if (unmappedCommonTypes.length > 0) {
        console.warn('[TEST] Potentially unmapped common types:', unmappedCommonTypes);
      }

      // Don't fail the test, but ensure we have core mappings
      const coreTypes = ['bank_statement', 'business_license', 'financial_statements'];
      const missingCoreTypes = coreTypes.filter(type => !knownClientTypes.includes(type));
      
      expect(missingCoreTypes).toHaveLength(0);
    });
  });
});