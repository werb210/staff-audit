import fetch from "node-fetch";
// Note: Using mock gaql for MVP - can be replaced with actual Google Ads read implementation
const gaql = async (query) => {
    console.log('Mock GAQL query:', query);
    return [];
};
import { v4 as uuid } from "uuid";
function cfg() {
    return {
        devToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        clientId: process.env.GOOGLE_ADS_CLIENT_ID,
        clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN,
        loginCid: (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replace(/-/g, ""),
        linkedCid: (process.env.GOOGLE_ADS_LINKED_CUSTOMER_ID || "").replace(/-/g, ""),
    };
}
async function token() {
    const c = cfg();
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: c.clientId,
            client_secret: c.clientSecret,
            refresh_token: c.refreshToken,
            grant_type: "refresh_token"
        })
    });
    const j = await res.json();
    if (!j.access_token)
        throw new Error("google_oauth_failed");
    return j.access_token;
}
async function mutate(resource, body) {
    const c = cfg();
    const tk = await token();
    const url = `https://googleads.googleapis.com/v16/customers/${c.linkedCid}/${resource}:mutate`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${tk}`,
            "developer-token": c.devToken,
            "login-customer-id": c.loginCid,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    const j = await res.json();
    if (!res.ok)
        throw new Error(`google_mutate_failed ${res.status} ${JSON.stringify(j)}`);
    return j;
}
export async function setCampaignBudget(campaignId, dailyMicros) {
    // fetch budget resource name for campaign
    const rows = await gaql(`SELECT campaign.resource_name, campaign.campaign_budget FROM campaign WHERE campaign.id = ${campaignId}`);
    const budgetRes = rows?.[0]?.campaign?.campaignBudget;
    if (!budgetRes)
        throw new Error("budget_not_found");
    return mutate("campaignBudgets", {
        customerId: cfg().linkedCid,
        operations: [{ updateMask: "amount_micros", update: { resourceName: budgetRes, amountMicros: String(dailyMicros) } }]
    });
}
export async function setCampaignStatus(campaignId, enabled) {
    return mutate("campaigns", {
        customerId: cfg().linkedCid,
        operations: [{
                updateMask: "status",
                update: {
                    resourceName: `customers/${cfg().linkedCid}/campaigns/${campaignId}`,
                    status: enabled ? "ENABLED" : "PAUSED"
                }
            }]
    });
}
export async function addNegativeKeywords(campaignId, negatives) {
    // Create negative keyword criteria at campaign level
    const ops = negatives.map(term => ({
        create: {
            resourceName: `customers/${cfg().linkedCid}/campaignCriteria/${uuid()}`,
            campaign: `customers/${cfg().linkedCid}/campaigns/${campaignId}`,
            negative: true,
            keyword: { matchType: "BROAD", text: term }
        }
    }));
    const c = cfg();
    const tk = await token();
    const url = `https://googleads.googleapis.com/v16/customers/${c.linkedCid}/campaignCriteria:mutate`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${tk}`,
            "developer-token": c.devToken,
            "login-customer-id": c.loginCid,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ customerId: c.linkedCid, operations: ops })
    });
    const j = await res.json();
    if (!res.ok)
        throw new Error("negatives_failed " + JSON.stringify(j));
    return j;
}
