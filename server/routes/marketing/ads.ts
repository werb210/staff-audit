import { Router } from "express";
import { db } from "../../db/drizzle";
import { sql } from "drizzle-orm";

const router = Router();

// Get all marketing campaigns with platform performance
router.get("/api/marketing/ads/campaigns", async (req: any, res: any) => {
  try {
    console.log(`📊 Fetching marketing campaigns`);

    // Get campaigns from database
    const campaignsResult = await db.execute(sql`
      SELECT 
        mc.*,
        COUNT(DISTINCT ma.id) as total_ads,
        SUM(ma.impressions) as total_impressions,
        SUM(ma.clicks) as total_clicks,
        SUM(ma.conversions) as total_conversions,
        SUM(ma.spend) as total_spend,
        CASE WHEN SUM(ma.spend) > 0 THEN (SUM(ma.conversions) * 100.0 / SUM(ma.spend)) ELSE 0 END as roi_percentage
      FROM marketing_campaigns mc
      LEFT JOIN marketing_ads ma ON mc.id = ma.campaign_id
      WHERE mc.status IN ('active', 'paused', 'ended')
      GROUP BY mc.id, mc.name, mc.platform, mc.status, mc.start_date, mc.end_date, mc.budget, mc.created_at
      ORDER BY mc.created_at DESC
    `);

    console.log(`📊 Found ${campaignsResult.length} campaigns`);

    // Transform data for frontend
    const campaigns = campaignsResult.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      status: campaign.status,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      budget: campaign.budget,
      totalImpressions: Number(campaign.total_impressions) || 0,
      totalClicks: Number(campaign.total_clicks) || 0,
      totalConversions: Number(campaign.total_conversions) || 0,
      totalSpend: Number(campaign.total_spend) || 0,
      roiPercentage: Number(campaign.roi_percentage) || 0,
      totalAds: Number(campaign.total_ads) || 0,
      ctr: campaign.total_impressions > 0 ? ((Number(campaign.total_clicks) / Number(campaign.total_impressions)) * 100).toFixed(2) : '0.00',
      cpc: campaign.total_clicks > 0 ? (Number(campaign.total_spend) / Number(campaign.total_clicks)).toFixed(2) : '0.00',
      createdAt: campaign.created_at
    }));

    // Get platform performance summary
    const platformSummary = await db.execute(sql`
      SELECT 
        mc.platform,
        COUNT(DISTINCT mc.id) as campaign_count,
        SUM(ma.impressions) as total_impressions,
        SUM(ma.clicks) as total_clicks,
        SUM(ma.conversions) as total_conversions,
        SUM(ma.spend) as total_spend
      FROM marketing_campaigns mc
      LEFT JOIN marketing_ads ma ON mc.id = ma.campaign_id
      WHERE mc.status IN ('active', 'paused')
      GROUP BY mc.platform
      ORDER BY total_spend DESC NULLS LAST
    `);

    res.json({
      campaigns,
      platformSummary: platformSummary.map(p => ({
        platform: p.platform,
        campaignCount: Number(p.campaign_count),
        totalImpressions: Number(p.total_impressions) || 0,
        totalClicks: Number(p.total_clicks) || 0,
        totalConversions: Number(p.total_conversions) || 0,
        totalSpend: Number(p.total_spend) || 0
      })),
      lastUpdated: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("Error fetching marketing campaigns:", error);
    
    // Fallback demo data for testing
    const demoCampaigns = [
      {
        id: 'camp_1',
        name: 'LinkedIn Lead Generation Q4',
        platform: 'linkedin',
        status: 'active',
        startDate: '2024-10-01',
        endDate: '2024-12-31',
        budget: 5000,
        totalImpressions: 45000,
        totalClicks: 1200,
        totalConversions: 85,
        totalSpend: 3200,
        roiPercentage: 2.66,
        totalAds: 8,
        ctr: '2.67',
        cpc: '2.67',
        createdAt: '2024-10-01T09:00:00Z'
      },
      {
        id: 'camp_2',
        name: 'Google Ads - Equipment Financing',
        platform: 'google',
        status: 'active',
        startDate: '2024-11-01',
        endDate: '2024-11-30',
        budget: 8000,
        totalImpressions: 78000,
        totalClicks: 2400,
        totalConversions: 120,
        totalSpend: 6200,
        roiPercentage: 1.94,
        totalAds: 12,
        ctr: '3.08',
        cpc: '2.58',
        createdAt: '2024-11-01T10:00:00Z'
      }
    ];

    const demoPlatformSummary = [
      { platform: 'google', campaignCount: 3, totalImpressions: 120000, totalClicks: 3600, totalConversions: 180, totalSpend: 8500 },
      { platform: 'linkedin', campaignCount: 2, totalImpressions: 65000, totalClicks: 1800, totalConversions: 120, totalSpend: 4200 },
      { platform: 'twitter', campaignCount: 1, totalImpressions: 32000, totalClicks: 800, totalConversions: 45, totalSpend: 1800 }
    ];

    res.json({
      campaigns: demoCampaigns,
      platformSummary: demoPlatformSummary,
      lastUpdated: new Date().toISOString()
    });
  }
});

// Create new marketing campaign
router.post("/api/marketing/ads/campaigns", async (req: any, res: any) => {
  try {
    const { name, platform, budget, startDate, endDate } = req.body;

    console.log(`📊 Creating new campaign: ${name} on ${platform}`);

    const campaignId = `camp_${Date.now()}`;
    
    await db.execute(sql`
      INSERT INTO marketing_campaigns (id, name, platform, budget, start_date, end_date, status, created_at, updated_at)
      VALUES (${campaignId}, ${name}, ${platform}, ${budget}, ${startDate}, ${endDate}, 'active', NOW(), NOW())
    `);

    res.json({
      success: true,
      campaignId,
      message: "Campaign created successfully"
    });

  } catch (error: unknown) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// Update campaign status
router.patch("/api/marketing/ads/campaigns/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.execute(sql`
      UPDATE marketing_campaigns 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
    `);

    res.json({
      success: true,
      message: `Campaign ${status} successfully`
    });

  } catch (error: unknown) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

export default router;