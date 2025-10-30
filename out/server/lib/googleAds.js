// Google Ads API integration with GAQL queries and AI assistance
import { GoogleAuth } from 'google-auth-library';
const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/adwords'],
    credentials: process.env.GOOGLE_ADS_CREDENTIALS ? JSON.parse(process.env.GOOGLE_ADS_CREDENTIALS) : undefined
});
async function executeGAQL({ query, customerId }) {
    try {
        const authClient = await auth.getClient();
        const accessToken = await authClient.getAccessToken();
        const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json',
                'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
                'login-customer-id': process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ''
            },
            body: JSON.stringify({ query })
        });
        if (!response.ok) {
            throw new Error(`Google Ads API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error('GAQL execution failed:', error);
        throw error;
    }
}
export async function getCampaignPerformance(customerId, dateRange = '7d') {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (parseInt(dateRange.replace('d', '')) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const query = `
    SELECT 
      campaign.id, 
      campaign.name, 
      campaign.status,
      metrics.impressions, 
      metrics.clicks, 
      metrics.cost_micros, 
      metrics.conversions, 
      metrics.conversions_value,
      metrics.ctr,
      segments.date
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
  `;
    return await executeGAQL({ query, customerId });
}
export async function getSearchTerms(customerId, dateRange = '7d') {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (parseInt(dateRange.replace('d', '')) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const query = `
    SELECT 
      segments.search_term, 
      ad_group.id, 
      ad_group.name,
      campaign.name,
      metrics.clicks, 
      metrics.conversions, 
      metrics.cost_micros,
      metrics.impressions
    FROM search_term_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.impressions > 0
    ORDER BY metrics.clicks DESC
    LIMIT 1000
  `;
    return await executeGAQL({ query, customerId });
}
export async function getPMaxAssets(customerId) {
    const query = `
    SELECT 
      asset_group_asset.asset, 
      asset_group_asset.field_type, 
      asset_group.name,
      campaign.name,
      metrics.clicks, 
      metrics.conversions,
      metrics.impressions
    FROM asset_group_asset
    WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
      AND metrics.impressions > 0
    ORDER BY metrics.clicks DESC
  `;
    return await executeGAQL({ query, customerId });
}
export async function getRecommendations(customerId) {
    const query = `
    SELECT 
      recommendation.resource_name,
      recommendation.type,
      recommendation.impact,
      recommendation.campaign_budget_recommendation.current_budget_amount_micros,
      recommendation.campaign_budget_recommendation.recommended_budget_amount_micros
    FROM recommendation
    WHERE recommendation.dismissed = false
    ORDER BY recommendation.impact.base_metrics.clicks DESC
    LIMIT 50
  `;
    return await executeGAQL({ query, customerId });
}
// AI-powered analysis functions
export function detectAnomalies(currentMetrics, historicalMetrics) {
    const anomalies = [];
    const currentSpend = currentMetrics.reduce((sum, m) => sum + (m.metrics?.cost_micros || 0), 0) / 1000000;
    const historicalAvgSpend = historicalMetrics.reduce((sum, m) => sum + (m.metrics?.cost_micros || 0), 0) / (1000000 * historicalMetrics.length);
    const spendChange = ((currentSpend - historicalAvgSpend) / historicalAvgSpend) * 100;
    if (Math.abs(spendChange) > 20) {
        anomalies.push({
            type: 'spend',
            change: spendChange,
            message: `Spend ${spendChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(spendChange).toFixed(1)}% vs 7-day avg`,
            severity: Math.abs(spendChange) > 50 ? 'high' : 'medium'
        });
    }
    return anomalies;
}
export function suggestBudgetRebalance(campaigns, targetSpend) {
    const suggestions = [];
    // Simple rebalancing logic: move budget from low-performing to high-performing campaigns
    const campaignsWithROAS = campaigns.map(c => ({
        ...c,
        roas: (c.metrics?.conversions_value || 0) / (c.metrics?.cost_micros || 1),
        currentSpend: (c.metrics?.cost_micros || 0) / 1000000
    })).sort((a, b) => b.roas - a.roas);
    const topPerformer = campaignsWithROAS[0];
    const bottomPerformer = campaignsWithROAS[campaignsWithROAS.length - 1];
    if (topPerformer && bottomPerformer && topPerformer.roas > bottomPerformer.roas * 2) {
        const rebalanceAmount = Math.min(bottomPerformer.currentSpend * 0.2, targetSpend * 0.1);
        suggestions.push({
            type: 'rebalance',
            fromCampaign: bottomPerformer.campaign.name,
            toCampaign: topPerformer.campaign.name,
            amount: rebalanceAmount,
            reason: `Move $${rebalanceAmount.toFixed(2)} from low-ROAS to high-ROAS campaign`
        });
    }
    return suggestions;
}
export function clusterSearchTerms(searchTerms) {
    const clusters = {};
    // Simple clustering by first word (can be enhanced with ML)
    searchTerms.forEach(term => {
        const firstWord = term.segments?.search_term?.split(' ')[0]?.toLowerCase();
        if (firstWord) {
            if (!clusters[firstWord])
                clusters[firstWord] = [];
            clusters[firstWord].push(term);
        }
    });
    return Object.entries(clusters)
        .map(([theme, terms]) => ({
        theme,
        terms,
        totalClicks: terms.reduce((sum, t) => sum + (t.metrics?.clicks || 0), 0),
        totalCost: terms.reduce((sum, t) => sum + (t.metrics?.cost_micros || 0), 0)
    }))
        .sort((a, b) => b.totalClicks - a.totalClicks);
}
