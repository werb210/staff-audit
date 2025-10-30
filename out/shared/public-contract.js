/**
 * PUBLIC API CONTRACT v1.0.0
 * Generated: 2025-07-27T22:08:30.470Z
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
];
// Application Stages (Pipeline)
export const APPLICATION_STAGES = [
    'New',
    'In Review',
    'Off to Lender',
    'Accepted',
    'Denied',
    'Funded'
];
// API Endpoints
export const API_ENDPOINTS = {
    SUBMIT_APPLICATION: '/api/public/applications',
    UPLOAD_DOCUMENT: '/api/public/upload',
    GET_APPLICATION: '/api/public/applications/:id',
    GET_DOCUMENTS: '/api/public/applications/:id/documents',
    VALIDATE_DOCUMENT_TYPE: '/api/document-validation/validate'
};
// Contract Metadata
export const CONTRACT_METADATA = {
    version: '1.0.0',
    generatedAt: '2025-07-27T22:08:30.470Z',
    locked: true,
    description: 'Production API contract for client applications',
    documentTypeCount: 30,
    applicationStageCount: 6
};
export default {
    DOCUMENT_TYPES,
    APPLICATION_STAGES,
    API_ENDPOINTS,
    CONTRACT_METADATA
};
