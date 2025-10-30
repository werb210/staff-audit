/**
 * CANONICAL DOCUMENT TYPE ENUM - TRUTH SOURCE
 *
 * This file contains the authoritative list of all document types supported by the system.
 * It is generated from the database enum and should be the single source of truth
 * for all document type validation across frontend and backend.
 *
 * Last updated: July 27, 2025
 * Database enum query: SELECT unnest(enum_range(NULL::document_type))
 */
// Complete list of document types from database enum
export const DOCUMENT_TYPES = [
    'account_prepared_financials',
    'accounts_payable',
    'accounts_receivable',
    'ap',
    'ar',
    'articles_of_incorporation',
    'balance_sheet',
    'bank_statements',
    'business_license',
    'business_plan',
    'cash_flow_statement',
    'collateral_docs',
    'drivers_license_front_back',
    'equipment_photos',
    'equipment_quote',
    'financial_statements',
    'invoice_samples',
    'other',
    'personal_financial_statement',
    'personal_guarantee',
    'pnl_statement',
    'profit_and_loss_statement',
    'profit_loss_statement',
    'proof_of_identity',
    'purchase_orders',
    'sba_forms',
    'signed_application',
    'supplier_agreement',
    'tax_returns',
    'void_pad'
];
// Human-readable labels for UI display
export const DOCUMENT_TYPE_LABELS = {
    'account_prepared_financials': 'Account Prepared Financials',
    'accounts_payable': 'Accounts Payable',
    'accounts_receivable': 'Accounts Receivable',
    'ap': 'Accounts Payable (AP)',
    'ar': 'Accounts Receivable (AR)',
    'articles_of_incorporation': 'Articles of Incorporation',
    'balance_sheet': 'Balance Sheet',
    'bank_statements': 'Bank Statements',
    'business_license': 'Business License',
    'business_plan': 'Business Plan',
    'cash_flow_statement': 'Cash Flow Statement',
    'collateral_docs': 'Collateral Documents',
    'drivers_license_front_back': 'Driver\'s License (Front & Back)',
    'equipment_photos': 'Equipment Photos',
    'equipment_quote': 'Equipment Quote',
    'financial_statements': 'Financial Statements',
    'invoice_samples': 'Invoice Samples',
    'other': 'Other Documents',
    'personal_financial_statement': 'Personal Financial Statement',
    'personal_guarantee': 'Personal Guarantee',
    'pnl_statement': 'P&L Statement',
    'profit_and_loss_statement': 'Profit and Loss Statement',
    'profit_loss_statement': 'Profit/Loss Statement',
    'proof_of_identity': 'Proof of Identity',
    'purchase_orders': 'Purchase Orders',
    'sba_forms': 'SBA Forms',
    'signed_application': 'Signed Application',
    'supplier_agreement': 'Supplier Agreement',
    'tax_returns': 'Tax Returns',
    'void_pad': 'Void Pad'
};
// Validation function
export function isValidDocumentType(type) {
    return DOCUMENT_TYPES.includes(type);
}
// Categories for grouping in UI
export const DOCUMENT_CATEGORIES = {
    financial: [
        'bank_statements',
        'financial_statements',
        'balance_sheet',
        'cash_flow_statement',
        'pnl_statement',
        'profit_and_loss_statement',
        'profit_loss_statement',
        'account_prepared_financials',
        'personal_financial_statement'
    ],
    tax: [
        'tax_returns'
    ],
    legal: [
        'articles_of_incorporation',
        'business_license',
        'personal_guarantee',
        'sba_forms'
    ],
    identity: [
        'drivers_license_front_back',
        'proof_of_identity'
    ],
    business: [
        'business_plan',
        'signed_application',
        'supplier_agreement'
    ],
    accounting: [
        'accounts_payable',
        'accounts_receivable',
        'ap',
        'ar',
        'invoice_samples',
        'purchase_orders'
    ],
    assets: [
        'equipment_photos',
        'equipment_quote',
        'collateral_docs',
        'void_pad'
    ],
    other: [
        'other'
    ]
};
// Version tracking for CI/testing
export const ENUM_VERSION = {
    lastUpdated: '2025-07-27',
    count: DOCUMENT_TYPES.length,
    checksum: 'db-enum-30-types'
};
