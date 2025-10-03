import express from 'express';

const router = express.Router();

/**
 * GET /api/marketing/budgets
 * Fetch budget data
 */
router.get('/budgets', async (req: any, res: any) => {
  console.log('💰 [MARKETING] Fetching budgets');
  
  try {
    const { period = 'monthly' } = req.query;
    
    // Mock budget data
    const mockBudgets = [
      {
        id: 'budget-1',
        name: 'Q4 Business Loans Campaign',
        totalBudget: 15000,
        spent: 12800,
        remaining: 2200,
        period: 'monthly',
        campaigns: 5,
        status: 'active'
      },
      {
        id: 'budget-2', 
        name: 'Equipment Financing - Winter',
        totalBudget: 8500,
        spent: 9200,
        remaining: -700,
        period: 'monthly',
        campaigns: 3,
        status: 'exceeded'
      },
      {
        id: 'budget-3',
        name: 'SBA Loans - Small Business',
        totalBudget: 12000,
        spent: 6400,
        remaining: 5600,
        period: 'monthly',
        campaigns: 4,
        status: 'active'
      },
      {
        id: 'budget-4',
        name: 'Commercial Real Estate',
        totalBudget: 20000,
        spent: 18900,
        remaining: 1100,
        period: 'monthly',
        campaigns: 6,
        status: 'active'
      },
      {
        id: 'budget-5',
        name: 'Working Capital - Emergency',
        totalBudget: 5000,
        spent: 0,
        remaining: 5000,
        period: 'monthly',
        campaigns: 0,
        status: 'paused'
      }
    ];
    
    return res.json(mockBudgets);
    
  } catch (error: unknown) {
    console.error('❌ [MARKETING] Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

/**
 * GET /api/marketing/audiences
 * Fetch audience data with CRM matching
 */
router.get('/audiences', async (req: any, res: any) => {
  console.log('👥 [MARKETING] Fetching audiences');
  
  try {
    const { source = 'all' } = req.query;
    
    // Mock audience data with CRM matching
    const mockAudiences = [
      {
        id: 'audience-1',
        name: 'High-Value Business Owners',
        size: 15420,
        source: 'CRM',
        type: 'custom',
        status: 'active',
        crmMatched: 8930,
        campaigns: 5,
        lastUpdated: '2025-01-20'
      },
      {
        id: 'audience-2',
        name: 'Equipment Finance Prospects',
        size: 23500,
        source: 'Google Ads',
        type: 'lookalike',
        status: 'active',
        crmMatched: 4200,
        campaigns: 3,
        lastUpdated: '2025-01-18'
      },
      {
        id: 'audience-3',
        name: 'SBA Loan Applicants',
        size: 8900,
        source: 'CRM',
        type: 'remarketing',
        status: 'active',
        crmMatched: 8900,
        campaigns: 4,
        lastUpdated: '2025-01-19'
      },
      {
        id: 'audience-4',
        name: 'Real Estate Investors',
        size: 12300,
        source: 'Facebook',
        type: 'lookalike',
        status: 'building',
        crmMatched: 2100,
        campaigns: 2,
        lastUpdated: '2025-01-21'
      },
      {
        id: 'audience-5',
        name: 'Previous Loan Recipients',
        size: 6700,
        source: 'Custom',
        type: 'remarketing',
        status: 'active',
        crmMatched: 6700,
        campaigns: 6,
        lastUpdated: '2025-01-17'
      }
    ];
    
    // Filter by source if specified
    const filteredAudiences = source === 'all' 
      ? mockAudiences 
      : mockAudiences.filter(audience => audience.source === source);
    
    return res.json(filteredAudiences);
    
  } catch (error: unknown) {
    console.error('❌ [MARKETING] Error fetching audiences:', error);
    res.status(500).json({ error: 'Failed to fetch audiences' });
  }
});

export default router;