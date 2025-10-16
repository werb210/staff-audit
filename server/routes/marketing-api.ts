import { Router } from "express";

const router = Router();

// Mock campaign data for development
const mockGoogleAdsCampaigns = [
  {
    id: 'gads_001',
    name: 'Business Loan Keywords',
    adType: 'search',
    headline: 'Get Business Funding Fast',
    description: 'Quick approvals for business loans. Apply today for funding up to $500k.',
    targetUrl: 'https://boreal.financial/apply',
    keywords: ['business loans', 'small business funding', 'equipment financing'],
    budget: 2500,
    bidStrategy: 'cpc',
    status: 'active',
    impressions: 12450,
    clicks: 234,
    conversions: 18,
    cost: 1240.50,
    qualityScore: 8.2,
    createdAt: '2025-08-15T10:00:00Z'
  },
  {
    id: 'gads_002', 
    name: 'Real Estate Investment',
    adType: 'search',
    headline: 'Real Estate Investment Loans',
    description: 'Finance your real estate investments with competitive rates.',
    targetUrl: 'https://boreal.financial/real-estate',
    keywords: ['real estate loans', 'investment property financing', 'commercial mortgages'],
    budget: 1800,
    bidStrategy: 'cpc',
    status: 'active',
    impressions: 8920,
    clicks: 156,
    conversions: 12,
    cost: 890.25,
    qualityScore: 7.8,
    createdAt: '2025-08-10T14:30:00Z'
  }
];

const mockLinkedInCampaigns = [
  {
    id: 'li_001',
    name: 'B2B Outreach Sequence',
    type: 'messaging',
    audience: 'Business Owners & CEOs',
    status: 'active',
    messagesSetn: 145,
    responses: 23,
    responseRate: 15.9,
    connectionsRequested: 89,
    connectionsAccepted: 34,
    createdAt: '2025-08-12T09:00:00Z'
  }
];

// GET /api/marketing/google-ads/campaigns
router.get("/marketing/google-ads/campaigns", async (req: any, res: any) => {
  try {
    console.log("📊 Loading Google Ads campaigns");
    res.json({ 
      success: true,
      items: mockGoogleAdsCampaigns,
      count: mockGoogleAdsCampaigns.length 
    });
  } catch (error: unknown) {
    console.error("Error loading Google Ads campaigns:", error);
    res.status(500).json({ error: "Failed to load campaigns" });
  }
});

// POST /api/marketing/google-ads/campaigns
router.post("/marketing/google-ads/campaigns", async (req: any, res: any) => {
  try {
    const campaignData = req.body;
    console.log("📊 Creating Google Ads campaign:", campaignData.name);
    
    const newCampaign = {
      id: `gads_${Date.now()}`,
      ...campaignData,
      status: 'draft',
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
      qualityScore: 0,
      createdAt: new Date().toISOString()
    };
    
    mockGoogleAdsCampaigns.push(newCampaign);
    
    res.status(201).json({ 
      success: true,
      campaign: newCampaign 
    });
  } catch (error: unknown) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// GET /api/marketing/linkedin/campaigns
router.get("/marketing/linkedin/campaigns", async (req: any, res: any) => {
  try {
    console.log("📊 Loading LinkedIn campaigns");
    res.json({ 
      success: true,
      items: mockLinkedInCampaigns,
      count: mockLinkedInCampaigns.length 
    });
  } catch (error: unknown) {
    console.error("Error loading LinkedIn campaigns:", error);
    res.status(500).json({ error: "Failed to load campaigns" });
  }
});

// POST /api/marketing/linkedin/campaigns
router.post("/marketing/linkedin/campaigns", async (req: any, res: any) => {
  try {
    const campaignData = req.body;
    console.log("📊 Creating LinkedIn campaign:", campaignData.name);
    
    const newCampaign = {
      id: `li_${Date.now()}`,
      ...campaignData,
      status: 'draft',
      messagesSetn: 0,
      responses: 0,
      responseRate: 0,
      connectionsRequested: 0,
      connectionsAccepted: 0,
      createdAt: new Date().toISOString()
    };
    
    mockLinkedInCampaigns.push(newCampaign);
    
    res.status(201).json({ 
      success: true,
      campaign: newCampaign 
    });
  } catch (error: unknown) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

export default router;