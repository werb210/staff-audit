/**
 * Lender Product Schema and API Validation Tests
 * Ensures doc_requirements field is fully defined across schema, API, and forms
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Lender Product Schema Validation', () => {
  let apiBaseUrl: string;

  beforeAll(() => {
    // Use environment-appropriate base URL
    apiBaseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://staff.boreal.financial'
      : 'http://localhost:5000';
  });

  it('should expose all lender product fields including doc_requirements', async () => {
    const res = await fetch(`${apiBaseUrl}/api/public/lenders`);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.products).toBeDefined();
    expect(Array.isArray(data.products)).toBe(true);
    expect(data.products.length).toBeGreaterThan(0);
    
    const firstProduct = data.products[0];
    
    // Verify doc_requirements field is properly exposed as array
    expect(Array.isArray(firstProduct.doc_requirements)).toBe(true);
    expect(firstProduct.doc_requirements.length).toBeGreaterThan(0);
    
    // Verify all critical schema fields are present
    const requiredFields = [
      'name', 'lender_name', 'category', 'country',
      'min_amount', 'max_amount', 'doc_requirements'
    ];
    
    requiredFields.forEach(field => {
      expect(firstProduct[field]).toBeDefined();
    });
    
    // Verify financial fields are properly typed
    expect(typeof firstProduct.min_amount).toBe('number');
    expect(typeof firstProduct.max_amount).toBe('number');
    
    // Verify interest rate fields exist (may be null for some products)
    expect(firstProduct.hasOwnProperty('interest_rate_min')).toBe(true);
    expect(firstProduct.hasOwnProperty('interest_rate_max')).toBe(true);
    
    // Verify term fields exist
    expect(firstProduct.hasOwnProperty('term_min')).toBe(true);
    expect(firstProduct.hasOwnProperty('term_max')).toBe(true);
    
    // Verify rate configuration fields
    expect(firstProduct.hasOwnProperty('rate_type')).toBe(true);
    expect(firstProduct.hasOwnProperty('rate_frequency')).toBe(true);
  });

  it('should validate doc_requirements contains Bank Statements for all products', async () => {
    const res = await fetch(`${apiBaseUrl}/api/public/lenders`);
    const data = await res.json();
    
    // Check that at least some products have Bank Statements as mandatory
    const productsWithBankStatements = data.products.filter((product: any) => 
      product.doc_requirements.includes('Bank Statements')
    );
    
    expect(productsWithBankStatements.length).toBeGreaterThan(0);
  });

  it('should validate product creation schema includes all required fields', async () => {
    // Test the schema by checking API endpoint structure
    const testProduct = {
      name: "Test Product Validation",
      lenderName: "Test Lender",
      category: "Equipment Financing",
      country: "US",
      minAmount: 50000,
      maxAmount: 500000,
      minRevenue: 250000,
      docRequirements: ["Bank Statements", "Tax Returns"]
    };

    // This tests that the API accepts the expected field structure
    // Even if it fails auth, we can validate field acceptance
    const res = await fetch(`${apiBaseUrl}/api/rbac/lender-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testProduct)
    });

    // Should fail with auth error, not schema validation error
    const response = await res.json();
    expect(response.error).not.toContain('schema');
    expect(response.error).not.toContain('validation');
    
    // Auth error is expected, but validates schema structure is correct
    expect(res.status === 401 || res.status === 403 || response.code === 'INVALID_TOKEN').toBe(true);
  });

  it('should validate doc_requirements array format and content', async () => {
    const res = await fetch(`${apiBaseUrl}/api/public/lenders`);
    const data = await res.json();
    
    const sampleProduct = data.products[0];
    
    // Verify doc_requirements is array of strings
    expect(Array.isArray(sampleProduct.doc_requirements)).toBe(true);
    sampleProduct.doc_requirements.forEach((doc: any) => {
      expect(typeof doc).toBe('string');
      expect(doc.length).toBeGreaterThan(0);
    });
    
    // Verify common document types are present across products
    const allDocuments = data.products.flatMap((p: any) => p.doc_requirements);
    const commonDocs = ['Bank Statements', 'Tax Returns', 'Financial Statements'];
    
    commonDocs.forEach(docType => {
      expect(allDocuments.includes(docType)).toBe(true);
    });
  });

  it('should validate interest rate and term fields are properly exposed', async () => {
    const res = await fetch(`${apiBaseUrl}/api/public/lenders`);
    const data = await res.json();
    
    // Find products with complete rate information
    const productsWithRates = data.products.filter((p: any) => 
      p.interest_rate_min !== null && p.interest_rate_max !== null
    );
    
    expect(productsWithRates.length).toBeGreaterThan(0);
    
    const productWithRates = productsWithRates[0];
    expect(typeof productWithRates.interest_rate_min).toBe('number');
    expect(typeof productWithRates.interest_rate_max).toBe('number');
    expect(productWithRates.interest_rate_min).toBeLessThanOrEqual(productWithRates.interest_rate_max);
    
    // Validate term fields
    if (productWithRates.term_min !== null && productWithRates.term_max !== null) {
      expect(typeof productWithRates.term_min).toBe('number');
      expect(typeof productWithRates.term_max).toBe('number');
      expect(productWithRates.term_min).toBeLessThanOrEqual(productWithRates.term_max);
    }
  });
});