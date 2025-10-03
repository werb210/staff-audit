import express from 'express';

const router = express.Router();

/**
 * GET /api/marketing/ab-tests
 * Fetch A/B testing data
 */
router.get('/ab-tests', async (req: any, res: any) => {
  console.log('🧪 [MARKETING] Fetching A/B tests');
  
  try {
    // Mock A/B test data
    const mockABTests = [
      {
        id: 'test-1',
        name: 'Landing Page Headline Test',
        status: 'Running',
        variants: [
          {
            name: 'Control - "Get Funding Fast"',
            traffic: 50,
            conversions: 156,
            conversionRate: 3.2,
            confidence: 87
          },
          {
            name: 'Variant A - "Business Loans Made Simple"',
            traffic: 50,
            conversions: 189,
            conversionRate: 3.8,
            confidence: 92
          }
        ],
        startDate: '2025-01-01',
        endDate: null,
        winner: null
      },
      {
        id: 'test-2',
        name: 'CTA Button Color Test',
        status: 'Completed',
        variants: [
          {
            name: 'Control - Blue Button',
            traffic: 50,
            conversions: 134,
            conversionRate: 2.8,
            confidence: 95
          },
          {
            name: 'Variant A - Green Button',
            traffic: 50,
            conversions: 167,
            conversionRate: 3.4,
            confidence: 98
          }
        ],
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        winner: 'Variant A - Green Button'
      },
      {
        id: 'test-3',
        name: 'Email Subject Line Test',
        status: 'Running',
        variants: [
          {
            name: 'Control - "Your Loan Application Update"',
            traffic: 33,
            conversions: 89,
            conversionRate: 4.2,
            confidence: 78
          },
          {
            name: 'Variant A - "Quick Update on Your Business Loan"',
            traffic: 33,
            conversions: 95,
            conversionRate: 4.5,
            confidence: 82
          },
          {
            name: 'Variant B - "Important: Your Loan Status"',
            traffic: 34,
            conversions: 102,
            conversionRate: 4.8,
            confidence: 85
          }
        ],
        startDate: '2025-01-15',
        endDate: null,
        winner: null
      },
      {
        id: 'test-4',
        name: 'Application Form Length Test',
        status: 'Completed',
        variants: [
          {
            name: 'Control - Full Form (12 fields)',
            traffic: 50,
            conversions: 78,
            conversionRate: 1.9,
            confidence: 96
          },
          {
            name: 'Variant A - Short Form (6 fields)',
            traffic: 50,
            conversions: 145,
            conversionRate: 3.6,
            confidence: 99
          }
        ],
        startDate: '2024-11-15',
        endDate: '2024-12-15',
        winner: 'Variant A - Short Form (6 fields)'
      },
      {
        id: 'test-5',
        name: 'Product Page Layout Test',
        status: 'Paused',
        variants: [
          {
            name: 'Control - Left Sidebar',
            traffic: 50,
            conversions: 67,
            conversionRate: 2.4,
            confidence: 68
          },
          {
            name: 'Variant A - Top Navigation',
            traffic: 50,
            conversions: 72,
            conversionRate: 2.6,
            confidence: 71
          }
        ],
        startDate: '2025-01-10',
        endDate: null,
        winner: null
      }
    ];
    
    return res.json(mockABTests);
    
  } catch (error: unknown) {
    console.error('❌ [MARKETING] Error fetching A/B tests:', error);
    res.status(500).json({ error: 'Failed to fetch A/B tests' });
  }
});

/**
 * POST /api/marketing/ab-tests
 * Create a new A/B test
 */
router.post('/ab-tests', async (req: any, res: any) => {
  console.log('🧪 [MARKETING] Creating new A/B test');
  
  try {
    const { name, variants } = req.body;
    
    if (!name || !variants) {
      return res.status(400).json({ error: 'Name and variants are required' });
    }
    
    // Mock creation response
    const newTest = {
      id: `test-${Date.now()}`,
      name,
      status: 'Draft',
      variants: variants.map((variant: any) => ({
        ...variant,
        conversions: 0,
        conversionRate: 0,
        confidence: 0
      })),
      startDate: new Date().toISOString(),
      endDate: null,
      winner: null
    };
    
    console.log('✅ [MARKETING] A/B test created:', newTest.name);
    return res.json(newTest);
    
  } catch (error: unknown) {
    console.error('❌ [MARKETING] Error creating A/B test:', error);
    res.status(500).json({ error: 'Failed to create A/B test' });
  }
});

export default router;