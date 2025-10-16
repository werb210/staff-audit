/**
 * Document Requirements Service
 * Maps requirement IDs to human-readable categories and creates expected documents
 */

interface DocumentRequirement {
  id: string;
  category: string;
  displayName: string;
  description: string;
  required: boolean;
}

// Standard document requirements mapping - aligned with client app categories
const DOCUMENT_REQUIREMENTS_MAP: Record<string, DocumentRequirement> = {
  // Core required documents
  'bank_statements_6m': {
    id: 'bank_statements_6m',
    category: 'bank_statements',
    displayName: '6-Month Bank Statements',
    description: 'Recent 6 months of business bank statements',
    required: true
  },
  'bank_statements_3m': {
    id: 'bank_statements_3m',
    category: 'bank_statements',
    displayName: '3-Month Bank Statements', 
    description: 'Recent 3 months of business bank statements',
    required: true
  },
  'tax_returns_2y': {
    id: 'tax_returns_2y',
    category: 'tax_returns',
    displayName: '2-Year Tax Returns',
    description: 'Business tax returns for the last 2 years',
    required: true
  },
  'financial_statements': {
    id: 'financial_statements',
    category: 'financial_statements',
    displayName: 'Financial Statements',
    description: 'Profit & Loss, Balance Sheet statements',
    required: true
  },
  'business_license': {
    id: 'business_license',
    category: 'business_license',
    displayName: 'Business License',
    description: 'Current business license or registration',
    required: true
  },
  'articles_incorporation': {
    id: 'articles_incorporation',
    category: 'articles_of_incorporation',
    displayName: 'Articles of Incorporation',
    description: 'Legal incorporation documents',
    required: true
  },
  'voided_check': {
    id: 'voided_check',
    category: 'voided_check',
    displayName: 'Voided Check',
    description: 'Voided check from business bank account',
    required: true
  },
  
  // Additional document types
  'equipment_quote': {
    id: 'equipment_quote',
    category: 'equipment_quote',
    displayName: 'Equipment Quote',
    description: 'Quote or invoice for equipment being financed',
    required: false
  },
  'invoice_samples': {
    id: 'invoice_samples',
    category: 'invoice_samples',
    displayName: 'Invoice Samples',
    description: 'Sample invoices showing business revenue',
    required: false
  },
  'accounts_receivable_aging': {
    id: 'accounts_receivable_aging',
    category: 'accounts_receivable_aging',
    displayName: 'Accounts Receivable Aging',
    description: 'Report showing outstanding customer payments',
    required: false
  },
  'business_plan': {
    id: 'business_plan',
    category: 'business_plan',
    displayName: 'Business Plan',
    description: 'Comprehensive business plan document',
    required: false
  },
  'collateral_docs': {
    id: 'collateral_docs',
    category: 'collateral_docs',
    displayName: 'Collateral Documentation',
    description: 'Documentation for loan collateral assets',
    required: false
  },
  'personal_guarantee': {
    id: 'personal_guarantee',
    category: 'personal_guarantee',
    displayName: 'Personal Guarantee',
    description: 'Personal guarantee form from business owner',
    required: false
  }
};

export class DocumentRequirementsService {
  /**
   * Get document requirement by ID
   */
  static getRequirement(requirementId: string): DocumentRequirement | null {
    return DOCUMENT_REQUIREMENTS_MAP[requirementId] || null;
  }

  /**
   * Get all available document requirements
   */
  static getAllRequirements(): DocumentRequirement[] {
    return Object.values(DOCUMENT_REQUIREMENTS_MAP);
  }

  /**
   * Convert requirement IDs to expected documents format
   */
  static mapRequirementsToExpectedDocuments(
    applicationId: string,
    requirementIds: string[]
  ): Array<{
    applicationId: string;
    category: string;
    requirementId: string;
    required: boolean;
    status: string;
  }> {
    return requirementIds
      .map(reqId => {
        const requirement = this.getRequirement(reqId);
        if (!requirement) {
          console.warn(`Unknown requirement ID: ${reqId}`);
          return null;
        }

        return {
          applicationId,
          category: requirement.category,
          requirementId: requirement.id,
          required: requirement.required,
          status: 'pending'
        };
      })
      .filter(Boolean) as Array<{
        applicationId: string;
        category: string;
        requirementId: string;
        required: boolean;
        status: string;
      }>;
  }

  /**
   * Get default document requirements for generic applications
   */
  static getDefaultRequirements(): string[] {
    return [
      'bank_statements_6m',
      'voided_check', 
      'business_license',
      'tax_returns_2y'
    ];
  }

  /**
   * Validate if a category matches any requirement
   */
  static isValidCategory(category: string): boolean {
    return Object.values(DOCUMENT_REQUIREMENTS_MAP)
      .some(req => req.category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Find requirement by uploaded document category
   */
  static findRequirementByCategory(category: string): DocumentRequirement | null {
    return Object.values(DOCUMENT_REQUIREMENTS_MAP)
      .find(req => req.category.toLowerCase() === category.toLowerCase()) || null;
  }
}

export { DocumentRequirement };