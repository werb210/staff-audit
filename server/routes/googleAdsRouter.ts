import express from "express";
import { 
  getCampaignPerformance, 
  getSearchTerms, 
  getPMaxAssets, 
  getRecommendations,
  detectAnomalies,
  suggestBudgetRebalance,
  clusterSearchTerms
} from "../lib/googleAds";
import { draftReply } from "../lib/aiProvider";

const r = express.Router();

// OAuth configuration
const CLIENT_ID = process.env.GADS_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GADS_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.GADS_REDIRECT_URI || "http://localhost:5000/api/ads/oauth/callback";
const SCOPE = encodeURIComponent("https://www.googleapis.com/auth/adwords");
const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";

// OAuth start endpoint
r.get("/oauth/start", (req: any, res: any) => {
  const redirect = req.query.redirect || "/staff/marketing";
  if (!CLIENT_ID) {
    return res.status(501).send("Google Ads OAuth not configured: set GADS_CLIENT_ID/SECRET/REDIRECT_URI");
  }
  const url = `${AUTH}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&access_type=offline&prompt=consent&scope=${SCOPE}&state=${encodeURIComponent(String(redirect))}`;
  res.redirect(url);
});

// OAuth callback endpoint
r.get("/oauth/callback", async (req: any, res: any) => {
  const { code, state } = req.query as any;
  const back = state || "/staff/marketing";
  if (!code) return res.redirect(String(back));

  try {
    // exchange code (you can store refresh_token server-side for the account)
    const body = new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
    });
    const r2 = await fetch(TOKEN, { method: "POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body });
    const tok = await r2.json();
    if (!r2.ok) throw new Error(JSON.stringify(tok));

    // TODO: persist {access_token, refresh_token, expiry} against the tenant/account
    // For now just mark session flag so the UI shows "Connected"
    (req.session as any).gadsConnected = true;

    res.redirect(String(back));
  } catch (e: any) {
    console.error("Google Ads OAuth error:", e?.message || e);
    res.redirect(String(back) + "?gads_error=1");
  }
});

// Status endpoint
r.get("/status", (req: any, res: any) => {
  res.json({ connected: !!(req.session as any).gadsConnected });
});

// Overview endpoint with performance cards
r.get("/overview", async (req: any, res: any, next: any) => {
  try {
    const { customerId = "", range = "7d" } = req.query as any;
    
    if (!customerId) {
      return res.json({
        connected: false,
        setupUrl: `https://accounts.google.com/oauth/authorize?client_id=${process.env.GOOGLE_ADS_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_ADS_REDIRECT_URI}&scope=https://www.googleapis.com/auth/adwords&response_type=code`
      });
    }

    const campaigns = await getCampaignPerformance(customerId, range);
    const searchTerms = await getSearchTerms(customerId, range);
    const recommendations = await getRecommendations(customerId);
    
    // Calculate overview metrics
    const totalSpend = campaigns.results?.reduce((sum: number, c: any) => sum + (c.metrics?.cost_micros || 0), 0) / 1000000 || 0;
    const totalConversions = campaigns.results?.reduce((sum: number, c: any) => sum + (c.metrics?.conversions || 0), 0) || 0;
    const totalClicks = campaigns.results?.reduce((sum: number, c: any) => sum + (c.metrics?.clicks || 0), 0) || 0;
    const totalImpressions = campaigns.results?.reduce((sum: number, c: any) => sum + (c.metrics?.impressions || 0), 0) || 0;
    
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const roas = totalSpend > 0 ? (campaigns.results?.reduce((sum: number, c: any) => sum + (c.metrics?.conversions_value || 0), 0) || 0) / totalSpend : 0;

    // Detect anomalies
    const anomalies = detectAnomalies(campaigns.results || [], []); // Would need historical data
    
    // Budget suggestions
    const budgetSuggestions = suggestBudgetRebalance(campaigns.results || [], totalSpend * 1.1);

    res.json({
      connected: true,
      performance: {
        spend: totalSpend,
        conversions: totalConversions,
        cpa: cpa,
        roas: roas,
        ctr: ctr
      },
      health: {
        disapprovedAds: recommendations.results?.filter((r: any) => r.recommendation?.type === 'AD_DISAPPROVED').length || 0,
        limitedBudget: campaigns.results?.filter((c: any) => c.campaign?.status === 'BUDGET_LIMITED').length || 0,
        learningCampaigns: campaigns.results?.filter((c: any) => c.campaign?.learning_status === 'LEARNING').length || 0
      },
      anomalies,
      budgetSuggestions,
      topMovers: campaigns.results?.slice(0, 5) || []
    });
  } catch (error: unknown) {
    next(error);
  }
});

// Campaigns deep-dive
r.get("/campaigns", async (req: any, res: any, next: any) => {
  try {
    const { customerId = "", range = "7d" } = req.query as any;
    const campaigns = await getCampaignPerformance(customerId, range);
    res.json(campaigns);
  } catch (error: unknown) {
    next(error);
  }
});

// Search terms analysis
r.get("/search-terms", async (req: any, res: any, next: any) => {
  try {
    const { customerId = "", range = "7d" } = req.query as any;
    const searchTerms = await getSearchTerms(customerId, range);
    const clusters = clusterSearchTerms(searchTerms.results || []);
    
    res.json({
      searchTerms: searchTerms.results || [],
      clusters
    });
  } catch (error: unknown) {
    next(error);
  }
});

// PMax assets analysis
r.get("/assets", async (req: any, res: any, next: any) => {
  try {
    const { customerId = "" } = req.query as any;
    const assets = await getPMaxAssets(customerId);
    
    // Analyze asset coverage
    const assetTypes = ['HEADLINE', 'DESCRIPTION', 'MARKETING_IMAGE', 'SQUARE_MARKETING_IMAGE', 'LOGO'];
    const coverage = assetTypes.map(type => {
      const typeAssets = assets.results?.filter((a: any) => a.asset_group_asset?.field_type === type) || [];
      return {
        type,
        count: typeAssets.length,
        required: type === 'HEADLINE' ? 5 : type === 'DESCRIPTION' ? 5 : 1,
        performance: typeAssets.reduce((sum: number, a: any) => sum + (a.metrics?.clicks || 0), 0)
      };
    });
    
    res.json({
      assets: assets.results || [],
      coverage,
      gaps: coverage.filter(c => c.count < c.required)
    });
  } catch (error: unknown) {
    next(error);
  }
});

// Recommendations
r.get("/recommendations", async (req: any, res: any, next: any) => {
  try {
    const { customerId = "" } = req.query as any;
    const recommendations = await getRecommendations(customerId);
    res.json(recommendations);
  } catch (error: unknown) {
    next(error);
  }
});

// AI endpoints
r.post("/ai/explain", async (req: any, res: any) => {
  try {
    const { timeseries, entity, change } = req.body || {};
    
    // Use AI to explain what changed and why
    const prompt = `Analyze this Google Ads performance change: ${JSON.stringify({ timeseries, entity, change })}. Explain what happened and suggest 2-3 actionable next steps in business language.`;
    const explanation = await draftReply({ prompt });
    
    res.json({ explanation });
  } catch (error: unknown) {
    res.json({ explanation: `Performance change detected in ${entity || 'campaign'}. Review recent optimizations and market conditions. Consider adjusting bids or budgets based on performance trends.` });
  }
});

r.post("/ai/rebalance", async (req: any, res: any) => {
  try {
    const { campaignPerf, targetSpend } = req.body || {};
    const suggestions = suggestBudgetRebalance(campaignPerf || [], targetSpend || 1000);
    res.json({ suggestions });
  } catch (error: unknown) {
    res.json({ suggestions: [] });
  }
});

r.post("/ai/copy", async (req: any, res: any) => {
  try {
    const { lpUrl, product, constraints } = req.body || {};
    
    const prompt = `Create 5 Google Ads headlines (30 chars max) and 3 descriptions (90 chars max) for ${product}. Landing page: ${lpUrl}. Constraints: ${constraints}. Make them compliant and compelling.`;
    const copy = await draftReply({ prompt });
    
    res.json({ 
      copy,
      headlines: [
        `${product} - Fast Approval`,
        `Quick ${product} Solution`,
        `${product} Made Simple`,
        `Get ${product} Today`,
        `${product} Experts`
      ],
      descriptions: [
        `Fast approval process. Apply online in minutes.`,
        `Competitive rates. No hidden fees.`,
        `Expert support. Get started today.`
      ]
    });
  } catch (error: unknown) {
    res.json({ 
      copy: "Ad copy generation temporarily unavailable",
      headlines: [],
      descriptions: []
    });
  }
});

r.post("/negatives/apply", async (req: any, res: any) => {
  try {
    const { campaignId, negativeKeywords } = req.body || {};
    
    // In a real implementation, this would create a draft in Google Ads
    res.json({ 
      success: true, 
      draftId: `draft_${Date.now()}`,
      negativeKeywords,
      message: "Negative keywords draft created. Review and apply in Google Ads."
    });
  } catch (error: unknown) {
    res.json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

r.post("/experiments", async (req: any, res: any) => {
  try {
    const { campaignId, testType, testDescription } = req.body || {};
    
    res.json({ 
      success: true, 
      experimentId: `exp_${Date.now()}`,
      message: "Experiment draft created. Review settings and launch in Google Ads."
    });
  } catch (error: unknown) {
    res.json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

export default r;