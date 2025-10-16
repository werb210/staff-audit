// services/lenderProductService.ts
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { LenderProduct } from '../types/LenderProduct';

console.log('🏦 [LENDER-PRODUCT-SERVICE] Service loading...');

export async function getLenderProducts(): Promise<LenderProduct[]> {
  try {
    console.log('🏦 [LENDER-PRODUCT-SERVICE] Fetching all active lender products...');
    
    const products = await db.execute(sql`
      SELECT 
        id,
        lender_name as name,
        product_type as category,
        geography as country,
        amount_min as min_amount,
        amount_max as max_amount,
        description,
        doc_requirements as required_documents,
        is_active
      FROM lender_products 
      WHERE is_active = true
      ORDER BY lender_name, product_name
    `);
    
    const transformedProducts: LenderProduct[] = (products.rows || []).map((row: any) => {
      // Extract geography - handle array format {US} -> US
      let geography = row.country || 'US';
      if (typeof geography === 'string' && geography.includes('{')) {
        geography = geography.replace(/[{}]/g, '').split(',')[0].trim();
      }
      
      return {
        id: row.id,
        name: row.name || 'Unknown Lender',
        country: geography,
        category: transformCategoryToMatchingFormat(row.category),
        min_amount: row.min_amount || 10000,
        max_amount: row.max_amount || 5000000,
        min_time_in_business: 12, // Default 12 months - could be enhanced from description parsing
        min_monthly_revenue: Math.floor((row.min_amount || 10000) / 12), // Rough estimate based on min amount
        required_documents: Array.isArray(row.required_documents) ? row.required_documents : ['Bank Statements'],
        excluded_industries: [] // Could be enhanced from description parsing
      };
    });
    
    console.log(`🏦 [LENDER-PRODUCT-SERVICE] Transformed ${transformedProducts.length} products for matching`);
    return transformedProducts;
    
  } catch (error) {
    console.error('🏦 [LENDER-PRODUCT-SERVICE] Error fetching lender products:', error);
    return [];
  }
}

function transformCategoryToMatchingFormat(dbCategory: string): string {
  // Transform database enum values to matching format
  const categoryMap: { [key: string]: string } = {
    'working_capital': 'Working Capital',
    'equipment_financing': 'Equipment Financing',
    'asset_based_lending': 'Asset-Based Lending',
    'purchase_order_financing': 'Purchase Order Financing',
    'invoice_factoring': 'Invoice Factoring',
    'line_of_credit': 'Working Capital', // Map LOC to Working Capital for broader matching
    'term_loan': 'Working Capital', // Map term loan to Working Capital for broader matching
    'sba_loan': 'SBA Loan'
  };
  
  return categoryMap[dbCategory] || 'Working Capital'; // Default to Working Capital
}

console.log('🏦 [LENDER-PRODUCT-SERVICE] Service ready');