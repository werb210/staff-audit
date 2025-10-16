import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly.js";

const r = Router();
r.use(requireAuth);

// Google Ads campaign creation
r.post("/marketing/google-ads/campaign", async (req: any, res) => {
  try {
    const { name, budget_micros, target_cpa_micros, keywords = [] } = req.body || {};
    
    if (!name || !budget_micros) {
      return res.status(400).json({ ok: false, error: "name and budget_micros required" });
    }
    
    // Mock Google Ads API response for development
    const campaign = {
      id: `campaign_${Date.now()}`,
      name,
      budget_micros,
      target_cpa_micros,
      status: 'PAUSED', // Start paused for review
      keywords_added: keywords.length
    };
    
    // Log the campaign creation
    await db.execute(sql`
      INSERT INTO audience_sync_logs(platform, audience_name, items_uploaded, status, meta)
      VALUES('google_ads', ${name}, ${keywords.length}, 'campaign_created', ${JSON.stringify(campaign)}::jsonb)
    `);
    
    res.json({ 
      ok: true, 
      message: "Google Ads campaign created",
      campaign 
    });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Campaign creation failed" });
  }
});

// Twitter/X Ads CSV generator
r.post("/marketing/twitter-ads/csv", async (req: any, res: any) => {
  try {
    const { campaigns = [] } = req.body || {};
    
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return res.status(400).json({ ok: false, error: "campaigns array required" });
    }
    
    // Generate CSV content
    const headers = ['Campaign Name', 'Daily Budget', 'Bid Amount', 'Targeting', 'Creative Text'];
    const rows = campaigns.map((camp: any) => [
      camp.name || 'Untitled Campaign',
      camp.daily_budget || '100.00',
      camp.bid_amount || '2.50',
      camp.targeting || 'Interest: finance',
      camp.creative_text || 'Default ad text'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="twitter-ads-bulk.csv"');
    res.send(csvContent);
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "CSV generation failed" });
  }
});

// Bulk ad operations status
r.get("/marketing/bulk/status", async (req: any, res: any) => {
  try {
    const { rows } = await db.execute(sql`
      SELECT platform, COUNT(*) as operations, 
             MAX(created_at) as last_operation
      FROM audience_sync_logs 
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY platform
      ORDER BY last_operation DESC
    `);
    
    res.json({ ok: true, recent_operations: rows });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to get status" });
  }
});

export default r;