import { Router } from "express";
import { db } from "../db/drizzle.js";
import fetch from "node-fetch";
const r = Router();
// Mock GAQL function for demo purposes
async function fetchSearchTerms(start, end) {
    // This would connect to Google Ads API in production
    return [
        {
            campaign: { id: "123", name: "Campaign 1" },
            searchTermView: { searchTerm: "cheap loans bad credit" },
            metrics: { costMicros: 15000000, clicks: 0, impressions: 100 }
        },
        {
            campaign: { id: "123", name: "Campaign 1" },
            searchTermView: { searchTerm: "payday advance quick" },
            metrics: { costMicros: 12000000, clicks: 1, impressions: 80 }
        }
    ];
}
r.post("/ai/ads/negatives/suggest", async (req, res) => {
    const { days = 7 } = req.body || {};
    const end = new Date().toISOString().slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() - Number(days));
    const start = d.toISOString().slice(0, 10);
    const rows = await fetchSearchTerms(start, end);
    // Pick wasteful terms: high cost, low CTR (and we can't see conversions here → heuristic)
    const agg = new Map();
    for (const r of rows) {
        const key = `${r.campaign?.id}:${r.searchTermView?.searchTerm}`;
        const a = agg.get(key) || {
            campaignId: String(r.campaign?.id),
            cost: 0,
            clicks: 0,
            term: String(r.searchTermView?.searchTerm)
        };
        a.cost += Number(r.metrics?.costMicros || 0) / 1_000_000;
        a.clicks += Number(r.metrics?.clicks || 0);
        agg.set(key, a);
    }
    const list = Array.from(agg.values())
        .filter(a => a.cost >= 10 && a.clicks <= 1) // tweakable thresholds
        .slice(0, 200);
    // Ask AI to cluster to broader negatives (brand-safe)
    const prompt = `Cluster these wasteful search terms into negative keyword suggestions. Avoid blocking brand terms.
Return JSON: [{"campaignId":"123","negatives":["term one","term two"]}] and group by campaignId. Terms:\n` + JSON.stringify(list);
    const j = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
        })
    }).then(r => r.json());
    const data = JSON.parse(j.choices?.[0]?.message?.content || "{}");
    const actions = [];
    for (const row of (data?.suggestions || data || [])) {
        actions.push({
            provider: "google_ads",
            type: "add_negatives",
            campaignId: String(row.campaignId),
            terms: row.negatives || []
        });
    }
    // Store as an AiRecommendation plan (review + SMS approval flow re-used)
    const rec = await db.aiRecommendation.create({
        data: {
            tenant: "bf",
            windowDays: Number(days),
            goal: "waste_reduction",
            plan_json: { actions },
            rationale: "Search term waste clustering"
        }
    });
    res.json({ ok: true, recommendationId: rec.id, actions });
});
export default r;
