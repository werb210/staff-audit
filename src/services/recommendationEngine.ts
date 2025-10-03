interface Application {
  id: string;
  amount: number;
  country: string;
  timeInBusinessMonths: number;
  monthlyRevenue: number;
  industry: string;
  product_id?: string;
}

interface LenderProduct {
  id: string;
  lenderName: string;
  productName: string;
  productCategory: string;
  countryOffered: string;
  minimumLendingAmount: number;
  maximumLendingAmount: number;
  min_time_in_business: number;
  min_monthly_revenue: number;
  excluded_industries: string[];
  isActive: boolean;
  required_documents: string[];
}

interface LenderRecommendation {
  id: string;
  lenderName: string;
  productName: string;
  productCategory: string;
  matchScore: number;
  matchReasons: string[];
  requiredDocuments: string[];
  estimatedApprovalTime: string;
  interestRateRange: string;
}

export async function recommendationEngine(app: Application): Promise<LenderRecommendation[]> {
  try {
    // Fetch all active lender products
    const response = await fetch('http://localhost:5000/api/v1/products');
    const lenderProducts: LenderProduct[] = await response.json();
    
    const recommendations: LenderRecommendation[] = [];
    
    for (const product of lenderProducts) {
      if (!product.isActive) continue;
      
      const matchResult = calculateMatch(app, product);
      
      if (matchResult.isMatch) {
        recommendations.push({
          id: product.id,
          lenderName: product.lenderName || 'Unknown Lender',
          productName: product.productName,
          productCategory: product.productCategory,
          matchScore: matchResult.score,
          matchReasons: matchResult.reasons,
          requiredDocuments: product.required_documents || [],
          estimatedApprovalTime: getEstimatedApprovalTime(product.productCategory),
          interestRateRange: getInterestRateRange(product.productCategory)
        });
      }
    }
    
    // Sort by match score descending
    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
    
  } catch (error) {
    console.error('Recommendation engine error:', error);
    return [];
  }
}

function calculateMatch(app: Application, product: LenderProduct): { isMatch: boolean; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  // Country matching (required)
  if (product.countryOffered !== app.country) {
    return { isMatch: false, score: 0, reasons: ['Country not supported'] };
  }
  reasons.push(`Available in ${app.country}`);
  score += 25;
  
  // Amount range matching (required)
  if (app.amount < product.minimumLendingAmount || app.amount > product.maximumLendingAmount) {
    return { isMatch: false, score: 0, reasons: ['Amount outside lending range'] };
  }
  reasons.push(`Amount $${app.amount.toLocaleString()} within range`);
  score += 25;
  
  // Time in business (required)
  if (app.timeInBusinessMonths < product.min_time_in_business) {
    return { isMatch: false, score: 0, reasons: ['Insufficient time in business'] };
  }
  reasons.push(`${app.timeInBusinessMonths} months meets requirement`);
  score += 20;
  
  // Monthly revenue (required)
  if (app.monthlyRevenue < product.min_monthly_revenue) {
    return { isMatch: false, score: 0, reasons: ['Insufficient monthly revenue'] };
  }
  reasons.push(`$${app.monthlyRevenue.toLocaleString()} monthly revenue qualifies`);
  score += 20;
  
  // Industry exclusions
  if (product.excluded_industries && product.excluded_industries.includes(app.industry)) {
    return { isMatch: false, score: 0, reasons: ['Industry not supported'] };
  }
  
  // Bonus points for optimal fit
  if (app.amount >= product.minimumLendingAmount * 2) {
    score += 5;
    reasons.push('Strong loan amount fit');
  }
  
  if (app.timeInBusinessMonths >= product.min_time_in_business * 2) {
    score += 3;
    reasons.push('Well-established business');
  }
  
  if (app.monthlyRevenue >= product.min_monthly_revenue * 2) {
    score += 2;
    reasons.push('Strong revenue profile');
  }
  
  return { isMatch: true, score: Math.min(score, 100), reasons };
}

function getEstimatedApprovalTime(productCategory: string): string {
  const timeMap: { [key: string]: string } = {
    'Working Capital': '24-48 hours',
    'Equipment Financing': '3-5 business days',
    'Accounts Receivable Factoring': '24-72 hours',
    'Business Line of Credit': '2-4 business days',
    'Term Loan': '5-7 business days',
    'Merchant Cash Advance': '24 hours',
    'Invoice Factoring': '24-48 hours'
  };
  
  return timeMap[productCategory] || '3-5 business days';
}

function getInterestRateRange(productCategory: string): string {
  const rateMap: { [key: string]: string } = {
    'Working Capital': '8% - 25%',
    'Equipment Financing': '6% - 20%',
    'Accounts Receivable Factoring': '1% - 5%',
    'Business Line of Credit': '7% - 22%',
    'Term Loan': '6% - 18%',
    'Merchant Cash Advance': '15% - 50%',
    'Invoice Factoring': '1% - 4%'
  };
  
  return rateMap[productCategory] || '8% - 25%';
}