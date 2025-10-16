import { Router } from 'express';
import { db } from '../db';
import { lenderProducts } from '../models/lenderProduct';
import { eq, and, gte, lte, sql, inArray, or } from 'drizzle-orm';

const router = Router();

// GET /api/loan-products/required-documents/:category
// Returns required documents based on product category, country, and funding amount
router.get('/loan-products/required-documents/:category', async (req: any, res: any) => {
  try {
    const { category } = req.params;
    const { headquarters, fundingAmount } = req.query;

    if (!category || !headquarters || !fundingAmount) {
      return res.status(400).json({ 
        error: 'Missing required query parameters',
        required: ['category', 'headquarters', 'fundingAmount']
      });
    }

    console.log(`🔍 Fetching required documents for: category=${category}, country=${headquarters}, amount=${fundingAmount}`);

    const fundingAmountNum = Number(fundingAmount);
    if (isNaN(fundingAmountNum)) {
      return res.status(400).json({ error: 'fundingAmount must be a valid number' });
    }

    // Map category variations to database values
    const categoryMapping: { [key: string]: string[] } = {
      'term_loan': ['Term Loan', 'Business Term Loan'],
      'invoice_factoring': ['Invoice Factoring', 'Factoring'],
      'line_of_credit': ['Business Line of Credit', 'Line of Credit'],
      'equipment_financing': ['Equipment Financing', 'Equipment Loan'],
      'working_capital': ['Working Capital', 'Working Capital Loan'],
      'purchase_order_financing': ['Purchase Order Financing', 'PO Financing']
    };

    // Map country codes to full names used in database
    const countryMapping: { [key: string]: string } = {
      'CA': 'Canada',
      'US': 'United States'
    };

    const searchCategories = categoryMapping[category] || [category];
    const searchCountry = countryMapping[headquarters as string] || headquarters;

    // Create category conditions dynamically
    const categoryConditions = searchCategories.map(cat => eq(lenderProducts.productCategory, cat));
    const categoryMatch = categoryConditions.length === 1 ? categoryConditions[0] : or(...categoryConditions);

    // Query matching products with flexible category matching
    const matchingProducts = await db
      .select({
        id: lenderProducts.id,
        productName: lenderProducts.productName,
        lenderName: lenderProducts.lenderName,
        productCategory: lenderProducts.productCategory,
        country: lenderProducts.country,
        minAmount: lenderProducts.minAmount,
        maxAmount: lenderProducts.maxAmount,
        requiredDocuments: lenderProducts.requiredDocuments
      })
      .from(lenderProducts)
      .where(and(
        categoryMatch,
        eq(lenderProducts.country, searchCountry as string),
        lte(lenderProducts.minAmount, fundingAmountNum.toString()),
        gte(lenderProducts.maxAmount, fundingAmountNum.toString())
      ));

    console.log(`📊 Found ${matchingProducts.length} matching products`);

    if (matchingProducts.length === 0) {
      // Return default document requirements for the category
      const defaultDocuments = getDefaultDocuments(category);
      
      return res.json({
        productCount: 0,
        requiredDocuments: defaultDocuments,
        message: 'No matching products found, returning default requirements',
        searchCriteria: {
          category: searchCategories,
          country: searchCountry,
          fundingAmount: fundingAmountNum
        }
      });
    }

    // Collect all required documents from matching products
    const allRequiredDocs: string[] = [];
    matchingProducts.forEach(product => {
      if (product.requiredDocuments && Array.isArray(product.requiredDocuments)) {
        allRequiredDocs.push(...product.requiredDocuments);
      }
    });

    // Remove duplicates and filter out empty strings
    const uniqueRequiredDocs = [...new Set(allRequiredDocs.filter(doc => doc && doc.trim().length > 0))];

    // If no documents found, use defaults
    const finalDocuments = uniqueRequiredDocs.length > 0 
      ? uniqueRequiredDocs 
      : getDefaultDocuments(category);

    console.log(`✅ Returning ${finalDocuments.length} required documents`);

    res.json({
      productCount: matchingProducts.length,
      requiredDocuments: finalDocuments,
      matchingProducts: matchingProducts.map(p => ({
        id: p.id,
        productName: p.productName,
        lenderName: p.lenderName,
        category: p.productCategory
      })),
      searchCriteria: {
        category: searchCategories,
        country: searchCountry,
        fundingAmount: fundingAmountNum
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error fetching required documents:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Helper function to provide default document requirements by category
function getDefaultDocuments(category: string): string[] {
  const defaultsByCategory: { [key: string]: string[] } = {
    'term_loan': [
      'Bank Statements (6 months)',
      'Tax Returns (2 years)',
      'Financial Statements',
      'Business License',
      'Voided Check'
    ],
    'invoice_factoring': [
      'Accounts Receivable Aging',
      'Sample Invoices',
      'Bank Statements (3 months)',
      'Business License',
      'Customer List'
    ],
    'line_of_credit': [
      'Bank Statements (6 months)',
      'Tax Returns (1 year)',
      'Financial Statements',
      'Business License',
      'Accounts Receivable Aging'
    ],
    'equipment_financing': [
      'Equipment Quote/Invoice',
      'Bank Statements (3 months)',
      'Tax Returns (2 years)',
      'Business License',
      'Financial Statements'
    ],
    'working_capital': [
      'Bank Statements (6 months)',
      'Tax Returns (2 years)',
      'Financial Statements',
      'Business License',
      'Cash Flow Statements'
    ],
    'purchase_order_financing': [
      'Purchase Order',
      'Bank Statements (3 months)',
      'Tax Returns (1 year)',
      'Business License',
      'Customer Agreement'
    ]
  };

  return defaultsByCategory[category] || [
    'Bank Statements (6 months)',
    'Tax Returns (2 years)',
    'Financial Statements',
    'Business License'
  ];
}

export default router;