import { Router } from 'express';
import { z } from 'zod';
import { authenticatedRoute } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

const recommendationRequestSchema = z.object({
  businessType: z.string().min(1, 'Business type is required'),
  annualRevenue: z.number().positive('Annual revenue must be positive'),
  timeInBusiness: z.number().min(0, 'Time in business cannot be negative'),
  creditScore: z.number().min(300).max(850).optional(),
  requestedAmount: z.number().positive('Requested amount must be positive'),
  useOfFunds: z.string().min(1, 'Use of funds is required'),
  location: z.object({
    country: z.enum(['US', 'CA']),
    state: z.string().optional(),
    province: z.string().optional()
  }),
  businessStructure: z.enum(['sole_proprietorship', 'partnership', 'llc', 'corporation', 's_corp']).optional(),
  existingDebt: z.number().min(0).optional(),
  employeeCount: z.number().int().min(0).optional()
});

// POST /api/recommendations - Get product recommendations based on form data
router.post('/', authenticatedRoute, asyncHandler(async (req, res) => {
  const formData = recommendationRequestSchema.parse(req.body);

  // Recommendation scoring algorithm
  const productCategories = [
    {
      id: 'working_capital',
      name: 'Working Capital Loan',
      description: 'Short-term financing for daily operations and cash flow',
      minAmount: 5000,
      maxAmount: 500000,
      termMonths: '3-24',
      score: calculateWorkingCapitalScore(formData),
      reasons: getWorkingCapitalReasons(formData),
      requirements: [
        'Minimum 6 months in business',
        'Annual revenue of $50,000+',
        'Personal credit score 550+'
      ]
    },
    {
      id: 'equipment_financing',
      name: 'Equipment Financing',
      description: 'Secured financing for business equipment and machinery',
      minAmount: 10000,
      maxAmount: 2000000,
      termMonths: '12-84',
      score: calculateEquipmentScore(formData),
      reasons: getEquipmentReasons(formData),
      requirements: [
        'Equipment serves as collateral',
        'Minimum 1 year in business',
        'Annual revenue of $100,000+'
      ]
    },
    {
      id: 'sba_loan',
      name: 'SBA Loan',
      description: 'Government-backed loan with favorable terms',
      minAmount: 25000,
      maxAmount: 5000000,
      termMonths: '12-300',
      score: calculateSBAScore(formData),
      reasons: getSBAReasons(formData),
      requirements: [
        'US-based business only',
        'Minimum 2 years in business',
        'Annual revenue of $250,000+',
        'Personal credit score 680+'
      ]
    },
    {
      id: 'merchant_cash_advance',
      name: 'Merchant Cash Advance',
      description: 'Fast funding based on future credit card sales',
      minAmount: 2500,
      maxAmount: 250000,
      termMonths: '3-18',
      score: calculateMCAScore(formData),
      reasons: getMCAReasons(formData),
      requirements: [
        'Minimum 3 months in business',
        'Monthly credit card sales $5,000+',
        'Personal credit score 500+'
      ]
    },
    {
      id: 'business_line_of_credit',
      name: 'Business Line of Credit',
      description: 'Flexible access to funds as needed',
      minAmount: 10000,
      maxAmount: 1000000,
      termMonths: '12-60',
      score: calculateLOCScore(formData),
      reasons: getLOCReasons(formData),
      requirements: [
        'Minimum 1 year in business',
        'Annual revenue of $100,000+',
        'Personal credit score 600+'
      ]
    }
  ];

  // Filter products available in user's location
  const availableProducts = productCategories.filter(product => {
    if (product.id === 'sba_loan' && formData.location.country !== 'US') {
      return false;
    }
    return true;
  });

  // Sort by score (highest first) and return top recommendations
  const sortedProducts = availableProducts
    .sort((a, b) => b.score - a.score)
    .map(product => ({
      ...product,
      score: Math.round(product.score * 100) / 100 // Round to 2 decimal places
    }));

  res.json({
    recommendations: sortedProducts,
    formData: {
      businessType: formData.businessType,
      requestedAmount: formData.requestedAmount,
      location: formData.location
    },
    metadata: {
      totalProducts: sortedProducts.length,
      topScore: sortedProducts[0]?.score || 0,
      generatedAt: new Date().toISOString()
    }
  });
}));

// Scoring functions
function calculateWorkingCapitalScore(data: any): number {
  let score = 0.5; // Base score

  // Revenue factor
  if (data.annualRevenue >= 100000) score += 0.3;
  else if (data.annualRevenue >= 50000) score += 0.2;
  else if (data.annualRevenue >= 25000) score += 0.1;

  // Time in business factor
  if (data.timeInBusiness >= 2) score += 0.2;
  else if (data.timeInBusiness >= 1) score += 0.15;
  else if (data.timeInBusiness >= 0.5) score += 0.1;

  // Use of funds match
  if (data.useOfFunds.toLowerCase().includes('working capital') || 
      data.useOfFunds.toLowerCase().includes('cash flow') ||
      data.useOfFunds.toLowerCase().includes('inventory')) {
    score += 0.3;
  }

  // Credit score factor
  if (data.creditScore >= 650) score += 0.2;
  else if (data.creditScore >= 600) score += 0.15;
  else if (data.creditScore >= 550) score += 0.1;

  return Math.min(score, 1.0);
}

function calculateEquipmentScore(data: any): number {
  let score = 0.3; // Base score

  // Use of funds match
  if (data.useOfFunds.toLowerCase().includes('equipment') || 
      data.useOfFunds.toLowerCase().includes('machinery') ||
      data.useOfFunds.toLowerCase().includes('vehicle')) {
    score += 0.4;
  }

  // Revenue factor
  if (data.annualRevenue >= 200000) score += 0.25;
  else if (data.annualRevenue >= 100000) score += 0.2;

  // Time in business factor
  if (data.timeInBusiness >= 1) score += 0.15;

  return Math.min(score, 1.0);
}

function calculateSBAScore(data: any): number {
  let score = 0.2; // Base score

  // US only
  if (data.location.country !== 'US') return 0;

  // Time in business (critical for SBA)
  if (data.timeInBusiness >= 2) score += 0.3;
  else return 0;

  // Revenue factor
  if (data.annualRevenue >= 500000) score += 0.3;
  else if (data.annualRevenue >= 250000) score += 0.2;
  else return 0;

  // Credit score factor
  if (data.creditScore >= 700) score += 0.2;
  else if (data.creditScore >= 680) score += 0.15;
  else return 0;

  return Math.min(score, 1.0);
}

function calculateMCAScore(data: any): number {
  let score = 0.4; // Base score

  // Quick funding needs
  if (data.useOfFunds.toLowerCase().includes('urgent') ||
      data.useOfFunds.toLowerCase().includes('immediate') ||
      data.useOfFunds.toLowerCase().includes('fast')) {
    score += 0.3;
  }

  // Lower credit score businesses
  if (data.creditScore && data.creditScore < 600) {
    score += 0.2;
  }

  // Newer businesses
  if (data.timeInBusiness < 1) {
    score += 0.15;
  }

  return Math.min(score, 1.0);
}

function calculateLOCScore(data: any): number {
  let score = 0.4; // Base score

  // Use of funds match
  if (data.useOfFunds.toLowerCase().includes('flexible') ||
      data.useOfFunds.toLowerCase().includes('seasonal') ||
      data.useOfFunds.toLowerCase().includes('cash flow')) {
    score += 0.3;
  }

  // Established businesses
  if (data.timeInBusiness >= 1) score += 0.2;

  // Good credit
  if (data.creditScore >= 650) score += 0.2;

  return Math.min(score, 1.0);
}

// Reason generation functions
function getWorkingCapitalReasons(data: any): string[] {
  const reasons = [];
  if (data.annualRevenue >= 100000) reasons.push('Strong annual revenue supports loan capacity');
  if (data.timeInBusiness >= 1) reasons.push('Established business history');
  if (data.useOfFunds.toLowerCase().includes('working capital')) reasons.push('Perfect match for stated funding purpose');
  return reasons;
}

function getEquipmentReasons(data: any): string[] {
  const reasons = [];
  if (data.useOfFunds.toLowerCase().includes('equipment')) reasons.push('Equipment purchase aligns with loan purpose');
  if (data.annualRevenue >= 100000) reasons.push('Revenue supports equipment financing');
  return reasons;
}

function getSBAReasons(data: any): string[] {
  const reasons = [];
  if (data.location.country === 'US') reasons.push('US-based business qualifies for SBA programs');
  if (data.timeInBusiness >= 2) reasons.push('Business age meets SBA requirements');
  if (data.creditScore >= 680) reasons.push('Credit score meets SBA standards');
  return reasons;
}

function getMCAReasons(data: any): string[] {
  const reasons = [];
  if (data.timeInBusiness < 2) reasons.push('Newer businesses benefit from flexible MCA terms');
  reasons.push('Fast funding available');
  return reasons;
}

function getLOCReasons(data: any): string[] {
  const reasons = [];
  reasons.push('Flexible access to funds as needed');
  if (data.timeInBusiness >= 1) reasons.push('Business history supports credit line');
  return reasons;
}

export { router as recommendationRoutes };