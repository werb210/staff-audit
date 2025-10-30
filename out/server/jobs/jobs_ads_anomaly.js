import { pctDelta, smsStaff } from "./lib.js";
import fetch from "node-fetch";
export async function adsAnomalyJob() {
    const tenant = "bf";
    const a = await windowAgg(tenant, 1);
    const b = await windowAgg(tenant, 7);
    if (!a || !b)
        return;
    const cplA = a.clicks ? a.cost / a.clicks : 0;
    const cplB = b.clicks ? b.cost / b.clicks : 0;
    const spendSpike = pctDelta(b.cost / 7, a.cost);
    const cplSpike = pctDelta(cplB, cplA);
    const spendThresh = Number(process.env.ANOMALY_MAX_SPEND_SPIKE_PCT || 50);
    const cplThresh = Number(process.env.ANOMALY_MAX_CPL_INCREASE_PCT || 35);
    if (spendSpike > spendThresh || cplSpike > cplThresh) {
        // Ask the Copilot to build a plan (re-uses your /recommendations endpoint)
        const plan = await fetch(`http://localhost:5000/api/ai-ads/recommendations?window=7&goal=revenue`, {
            method: "POST"
        }).then(r => r.json()).catch(() => null);
        if (plan?.recommendationId) {
            await smsStaff(`ADS anomaly: spendΔ ${spendSpike.toFixed(0)}% / CPLΔ ${cplSpike.toFixed(0)}%. Plan ready. Approve via SMS link (sent).`);
            await fetch(`http://localhost:5000/api/ai-ads/recommendations/${plan.recommendationId}/request-approval`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: "Ads anomaly detected" })
            }).catch(() => { });
        }
        else {
            await smsStaff(`ADS anomaly: spendΔ ${spendSpike.toFixed(0)}% / CPLΔ ${cplSpike.toFixed(0)}%. No plan generated.`);
        }
    }
}
async function windowAgg(tenant, days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    // Note: adsSpend table may not exist in current schema
    // const rows = await db.adsSpend?.findMany({ 
    //   where: { tenant, date: { gte: d } } 
    // }) || [];
    const rows = []; // Temporary stub until adsSpend table is created
    if (!rows.length)
        return null;
    const cost = rows.reduce((s, x) => s + Number(x.costMicros) / 1_000_000, 0);
    const clicks = rows.reduce((s, x) => s + (x.clicks || 0), 0);
    return { cost, clicks };
}
