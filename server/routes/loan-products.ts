import { Router } from 'express';
import { db } from '../db';
import { lenderProducts } from '../../shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const router = Router();

// GET /api/loan-products/documents/:category
router.get('/documents/:category', async (req: any, res: any) => {
  try {
    const { category } = req.params;
    const { amount, country } = req.query;

    // Base required documents by category
    const documentRequirements: Record<string, string[]> = {
      'line_of_credit': [
        'bank_statements',
        'financial_statements', 
        'business_license',
        'tax_returns',
        'voided_check'
      ],
      'invoice_factoring': [
        'bank_statements',
        'accounts_receivable_aging',
        'invoice_samples',
        'business_license',
        'tax_returns'
      ],
      'equipment_financing': [
        'bank_statements',
        'equipment_quote',
        'business_license', 
        'tax_returns',
        'collateral_docs'
      ],
      'working_capital': [
        'bank_statements',
        'financial_statements',
        'business_license',
        'tax_returns',
        'business_plan'
      ],
      'term_loan': [
        'bank_statements',
        'financial_statements',
        'business_license',
        'tax_returns',
        'personal_guarantee'
      ],
      'purchase_order_financing': [
        'bank_statements',
        'purchase_orders',
        'business_license',
        'tax_returns',
        'supplier_agreements'
      ]
    };

    // Get base requirements for category
    let requiredDocs = documentRequirements[category] || [
      'bank_statements',
      'business_license', 
      'tax_returns',
      'voided_check'
    ];

    // Add additional requirements based on amount
    if (amount && parseInt(amount as string) > 500000) {
      requiredDocs.push('audited_financials');
      requiredDocs.push('personal_guarantee');
    }

    // Add country-specific requirements
    if (country === 'CA') {
      requiredDocs.push('cra_notice_of_assessment');
    }

    // Remove duplicates
    requiredDocs = Array.from(new Set(requiredDocs));

    res.json({
      success: true,
      category,
      requiredDocuments: requiredDocs,
      additionalInfo: {
        amount: amount || 'not_specified',
        country: country || 'US',
        estimatedProcessingTime: '3-5 business days'
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching document requirements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document requirements'
    });
  }
});

export default router;