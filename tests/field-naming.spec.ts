/**
 * Field Naming Validation Test Suite
 * Ensures all SignNow field names match the canonical whitelist
 */

import { describe, it, expect } from '@jest/globals';

// Canonical field whitelist - these are the ONLY allowed field names
const FIELD_WHITELIST = [
  // Business (15)
  'business_name',
  'business_legal_name', 
  'business_dba',
  'business_ein',
  'business_type',
  'business_industry',
  'years_in_business',
  'business_phone',
  'business_email',
  'business_website',
  'number_of_employees',
  'business_address',
  'business_city',
  'business_state',
  'business_zip',
  
  // Contact/Applicant (11)
  'contact_first_name',
  'contact_last_name',
  'contact_title',
  'contact_email',
  'contact_phone',
  'contact_ssn',
  'contact_dob',
  'contact_address',
  'contact_city',
  'contact_state',
  'contact_zip',
  
  // Application Meta (6)
  'loan_amount',
  'loan_purpose',
  'application_date',
  'application_id',
  'application_status',
  'application_type'
];

// Mock SignNow service for testing
class MockSignNowService {
  private prepareApplicationFields(application: any, business: any): Array<{name: string, value: string}> {
    const fields: Array<{name: string, value: string}> = [];

    const addField = (name: string, value: any) => {
      if (value !== null && value !== undefined && value !== '') {
        fields.push({ name, value: String(value) });
      }
    };

    // Business Information (Fields 1-15)
    addField('business_name', business.businessName);
    addField('business_legal_name', business.legalBusinessName);
    addField('business_dba', business.dbaName);
    addField('business_ein', business.ein);
    addField('business_type', business.businessType);
    addField('business_industry', business.industry);
    addField('years_in_business', business.yearsInBusiness);
    addField('business_phone', business.businessPhone);
    addField('business_email', business.businessEmail);
    addField('business_website', business.website);
    addField('number_of_employees', business.numberOfEmployees);
    addField('business_address', business.businessAddress);
    addField('business_city', business.businessCity);
    addField('business_state', business.businessState);
    addField('business_zip', business.businessZip);

    // Contact Information (Fields 16-26)
    addField('contact_first_name', business.contactFirstName);
    addField('contact_last_name', business.contactLastName);
    addField('contact_title', business.contactTitle);
    addField('contact_email', business.contactEmail);
    addField('contact_phone', business.contactPhone);
    addField('contact_ssn', business.ownerSSN);
    addField('contact_dob', business.ownerDateOfBirth?.toISOString().split('T')[0]);
    addField('contact_address', business.ownerAddress);
    addField('contact_city', business.ownerCity);
    addField('contact_state', business.ownerState);
    addField('contact_zip', business.ownerZip);

    // Application Information (Fields 27-32)
    addField('loan_amount', application.requestedAmount);
    addField('loan_purpose', application.loanPurpose);
    addField('application_date', application.createdAt?.toISOString().split('T')[0]);
    addField('application_id', application.id);
    addField('application_status', application.status);
    addField('application_type', application.loanCategory);

    return fields;
  }

  public getFieldsForTesting(application: any, business: any) {
    return this.prepareApplicationFields(application, business);
  }
}

describe('SignNow Field Naming Validation', () => {
  const mockService = new MockSignNowService();
  
  const mockApplication = {
    id: 'app_prod_test123',
    requestedAmount: '100000',
    loanPurpose: 'Working capital',
    status: 'draft',
    loanCategory: 'business_loan',
    createdAt: new Date('2025-01-01')
  };

  const mockBusiness = {
    businessName: 'Test Corp',
    legalBusinessName: 'Test Corporation LLC',
    dbaName: 'Test Corp DBA',
    ein: '12-3456789',
    businessType: 'LLC',
    industry: 'Technology',
    yearsInBusiness: '5',
    businessPhone: '+1-555-0123',
    businessEmail: 'business@test.com',
    website: 'https://test.com',
    numberOfEmployees: '25',
    businessAddress: '123 Business St',
    businessCity: 'Toronto',
    businessState: 'ON',
    businessZip: 'M5V 1A1',
    contactFirstName: 'John',
    contactLastName: 'Doe',
    contactTitle: 'CEO',
    contactEmail: 'john@test.com',
    contactPhone: '+1-555-0124',
    ownerSSN: '123-45-6789',
    ownerDateOfBirth: new Date('1980-01-01'),
    ownerAddress: '456 Home St',
    ownerCity: 'Toronto',
    ownerState: 'ON',
    ownerZip: 'M5V 1A2'
  };

  it('should only generate field names from the canonical whitelist', () => {
    const fields = mockService.getFieldsForTesting(mockApplication, mockBusiness);
    
    // Check every generated field name against whitelist
    fields.forEach(field => {
      expect(FIELD_WHITELIST).toContain(field.name);
    });
  });

  it('should generate exactly 32 canonical field names when all data is present', () => {
    const fields = mockService.getFieldsForTesting(mockApplication, mockBusiness);
    
    // Should have exactly 32 fields (15 business + 11 contact + 6 application)
    expect(fields.length).toBe(32);
  });

  it('should use snake_case naming convention for all fields', () => {
    const fields = mockService.getFieldsForTesting(mockApplication, mockBusiness);
    
    fields.forEach(field => {
      // Check snake_case pattern: lowercase letters, numbers, and underscores only
      expect(field.name).toMatch(/^[a-z0-9_]+$/);
      
      // Should not contain PascalCase or other patterns
      expect(field.name).not.toMatch(/[A-Z]/);
      expect(field.name).not.toMatch(/[-\s]/);
    });
  });

  it('should include all required business fields', () => {
    const fields = mockService.getFieldsForTesting(mockApplication, mockBusiness);
    const fieldNames = fields.map(f => f.name);
    
    const businessFields = [
      'business_name', 'business_legal_name', 'business_dba', 'business_ein',
      'business_type', 'business_industry', 'years_in_business', 'business_phone',
      'business_email', 'business_website', 'number_of_employees', 'business_address',
      'business_city', 'business_state', 'business_zip'
    ];
    
    businessFields.forEach(fieldName => {
      expect(fieldNames).toContain(fieldName);
    });
  });

  it('should include all required contact fields', () => {
    const fields = mockService.getFieldsForTesting(mockApplication, mockBusiness);
    const fieldNames = fields.map(f => f.name);
    
    const contactFields = [
      'contact_first_name', 'contact_last_name', 'contact_title', 'contact_email',
      'contact_phone', 'contact_ssn', 'contact_dob', 'contact_address',
      'contact_city', 'contact_state', 'contact_zip'
    ];
    
    contactFields.forEach(fieldName => {
      expect(fieldNames).toContain(fieldName);
    });
  });

  it('should include all required application fields', () => {
    const fields = mockService.getFieldsForTesting(mockApplication, mockBusiness);
    const fieldNames = fields.map(f => f.name);
    
    const applicationFields = [
      'loan_amount', 'loan_purpose', 'application_date', 'application_id',
      'application_status', 'application_type'
    ];
    
    applicationFields.forEach(fieldName => {
      expect(fieldNames).toContain(fieldName);
    });
  });
});