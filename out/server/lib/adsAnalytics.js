const HAS_ADS = !!(process.env.GADS_DEVELOPER_TOKEN || process.env.GADS_CLIENT_ID);
function mockKPIs(days = 7) {
    const impressions = 17000 + Math.floor(Math.random() * 3000);
    const clicks = Math.floor(impressions * (0.03 + Math.random() * 0.01));
    const conversions = Math.max(0, Math.floor(clicks * (0.06 + Math.random() * 0.02)));
    const cost = +(clicks * (1.2 + Math.random() * 0.5)).toFixed(2);
    const revenue = +(conversions * (120 + Math.random() * 80)).toFixed(2);
    const ctr = +(clicks / Math.max(1, impressions) * 100).toFixed(2);
    const cpa = +(cost / Math.max(1, conversions)).toFixed(2);
    const roas = +(revenue / Math.max(0.01, cost)).toFixed(2);
    return { impressions, clicks, ctr, conversions, cost, cpa, roas, revenue };
}
function mockCampaigns(n = 6) {
    const names = ["Brand Search", "PMax – Core", "Competitors", "Remarketing", "Non-brand Search", "Display Prospecting"];
    return names.slice(0, n).map((name, i) => ({
        id: String(1000 + i),
        name,
        channel: "google",
        status: i === 2 ? "limited" : "enabled",
        spend: +(50 + Math.random() * 450).toFixed(2),
        clicks: 100 + Math.floor(Math.random() * 1200),
        conv: 5 + Math.floor(Math.random() * 60),
        roas: +(1 + Math.random() * 6).toFixed(2)
    }));
}
function findAnomalies(k) {
    const out = [];
    if (k.cpa > 75)
        out.push({ kind: "cpa_worsen", msg: `CPA elevated at $${k.cpa}`, severity: "med" });
    if (k.roas < 1.2)
        out.push({ kind: "roas_drop", msg: `ROAS weak (${k.roas}x)`, severity: "high" });
    if (k.clicks > 0 && k.conversions === 0)
        out.push({ kind: "lead_drop", msg: "Clicks but no conversions", severity: "high" });
    return out;
}
// TODO: swap these stubs with real GAQL pulls when creds are present
async function fetchKPIsFromAds(customerId, dateRange) {
    if (!HAS_ADS)
        return mockKPIs();
    // Placeholder: return mock that marks "connected"
    return mockKPIs();
}
async function fetchCampaignsFromAds(customerId, dateRange) {
    if (!HAS_ADS)
        return mockCampaigns();
    return mockCampaigns();
}
async function fetchSearchTerms(customerId, dateRange) {
    return [
        { term: "business loan", clicks: 180, conv: 8, cost: 210.45 },
        { term: "invoice financing", clicks: 95, conv: 7, cost: 120.10 },
        { term: "merchant cash advance", clicks: 140, conv: 2, cost: 260.33 },
        { term: "fast working capital", clicks: 75, conv: 0, cost: 88.40 }
    ];
}
export async function overview(customerId, dateRange = "last_7_days") {
    const kpis = await fetchKPIsFromAds(customerId, dateRange);
    const anomalies = findAnomalies(kpis);
    const campaigns = await fetchCampaignsFromAds(customerId, dateRange);
    const topMovers = campaigns.slice().sort((a, b) => b.roas - a.roas).slice(0, 3);
    const underperf = campaigns.slice().sort((a, b) => a.roas - b.roas).slice(0, 3);
    return { connected: HAS_ADS, kpis, anomalies, topMovers, underperf, campaigns };
}
export async function smartNegatives(customerId, dateRange = "last_30_days") {
    const terms = await fetchSearchTerms(customerId, dateRange);
    const negatives = terms.filter(t => t.conv === 0 && t.cost > 50).map(t => ({ term: t.term, reason: "Costly non-converter" }));
    const candidates = terms.filter(t => t.conv > 0 && t.cost / t.conv > 60).map(t => ({ term: `[${t.term}]`, reason: "Consider exact match to tighten" }));
    return { negatives, tighten: candidates };
}
export function rebalance(campaigns, monthlyTarget) {
    const total = campaigns.reduce((s, c) => s + c.spend, 0);
    if (total === 0)
        return { total, plan: campaigns.map(c => ({ id: c.id, name: c.name, delta: 0 })) };
    const winners = campaigns.filter(c => c.roas >= 2);
    const losers = campaigns.filter(c => c.roas < 1.2);
    const give = losers.reduce((s, c) => s + (c.spend * 0.15), 0);
    const takeEach = winners.length ? give / winners.length : 0;
    const plan = campaigns.map(c => {
        if (losers.includes(c))
            return { id: c.id, name: c.name, delta: -(c.spend * 0.15) };
        if (winners.includes(c))
            return { id: c.id, name: c.name, delta: +takeEach };
        return { id: c.id, name: c.name, delta: 0 };
    });
    const projected = total + plan.reduce((s, p) => s + p.delta, 0);
    return { total, projected, monthlyTarget, plan };
}
