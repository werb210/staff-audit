#!/usr/bin/env node

/**
 * PUBLIC CONTRACT GENERATOR v1.0.0
 * Generates public-contract.ts with all client-facing schemas
 * This locks the API contract for production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 PUBLIC CONTRACT GENERATOR v1.0.0');
console.log('📋 Generating public-contract.ts for production deployment...');

const publicContract = `/**
 * PUBLIC API CONTRACT v1.0.0
 * Generated: ${new Date().toISOString()}
 * 
 * This file contains all client-facing API schemas and types.
 * DO NOT MODIFY - This contract is locked for production stability.
 */

// Document Types (Canonical List - 30 Types)
export const DOCUMENT_TYPES = [
  'bank_statement',
  'tax_return',
  'balance_sheet',
  'income_statement',
  'cash_flow_statement',
  'voided_check',
  'business_license',
  'articles_incorporation',
  'profit_loss_statement',
  'accounts_receivable_aging',
  'accounts_payable_aging',
  'business_debt_schedule',
  'personal_financial_statement',
  'personal_tax_return',
  'drivers_license',
  'passport',
  'utility_bill',
  'lease_agreement',
  'purchase_agreement',
  'insurance_certificate',
  'financial_projections',
  'bank_reference_letter',
  'vendor_contracts',
  'customer_contracts',
  'equipment_list',
  'inventory_report',
  'credit_report',
  'loan_application',
  'collateral_documentation',
  'other_financial_document'
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

// Application Stages (Pipeline)
export const APPLICATION_STAGES = [
  'New',
  'In Review', 
  'Off to Lender',
  'Accepted',
  'Denied',
  'Funded'
] as const;

export type ApplicationStage = typeof APPLICATION_STAGES[number];

// Client Application Schema
export interface ClientApplication {
  id: string;
  status: ApplicationStage;
  submittedAt: string;
  formData: {
    step1?: {
      requestedAmount?: number;
      useOfFunds?: string;
      businessType?: string;
    };
    step2?: {
      businessName?: string;
      legalBusinessName?: string;
      industry?: string;
      yearsInBusiness?: number;
      numberOfEmployees?: number;
      monthlyRevenue?: number;
      annualRevenue?: number;
    };
    step3?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      businessPhone?: string;
      businessEmail?: string;
      title?: string;
    };
    step4?: {
      businessAddress?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
}

// Document Schema
export interface ClientDocument {
  id: string;
  fileName: string;
  documentType: DocumentType;
  fileSize: number;
  status: 'pending' | 'accepted' | 'rejected';
  uploadedAt: string;
  acceptedAt?: string;
}

// API Response Schemas
export interface ApplicationSubmissionResponse {
  success: boolean;
  applicationId: string;
  message: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  documentId: string;
  fileName: string;
  documentType: DocumentType;
  message: string;
}

export interface ValidationError {
  success: false;
  error: string;
  field?: string;
  code?: string;
}

// API Endpoints
export const API_ENDPOINTS = {
  SUBMIT_APPLICATION: '/api/public/applications',
  UPLOAD_DOCUMENT: '/api/public/upload',
  GET_APPLICATION: '/api/public/applications/:id',
  GET_DOCUMENTS: '/api/public/applications/:id/documents',
  VALIDATE_DOCUMENT_TYPE: '/api/document-validation/validate'
} as const;

// Contract Metadata
export const CONTRACT_METADATA = {
  version: '1.0.0',
  generatedAt: '${new Date().toISOString()}',
  locked: true,
  description: 'Production API contract for client applications',
  documentTypeCount: 30,
  applicationStageCount: 6
} as const;

export default {
  DOCUMENT_TYPES,
  APPLICATION_STAGES,
  API_ENDPOINTS,
  CONTRACT_METADATA
};
`;

// Write the contract file  
const contractPath = path.join(path.dirname(__dirname), 'shared', 'public-contract.ts');
fs.writeFileSync(contractPath, publicContract);

console.log('✅ public-contract.ts generated successfully');
console.log('📍 Location:', contractPath);
console.log('🔒 Contract Version: v1.0.0');
console.log('📊 Document Types: 30');
console.log('📈 Application Stages: 6');
console.log('🚀 Ready for production deployment');