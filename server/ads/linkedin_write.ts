import fetch from "node-fetch";

function cfg() { 
  return { 
    token: process.env.LINKEDIN_ACCESS_TOKEN!, 
    acct: process.env.LINKEDIN_AD_ACCOUNT_ID! 
  }; 
}

export async function setCampaignStatus(campaignId: string, enabled: boolean) {
  const { token } = cfg();
  const url = `https://api.linkedin.com/v2/adCampaignsV2/${campaignId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { 
      "Authorization": `Bearer ${token}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ status: enabled ? "ACTIVE" : "PAUSED" })
  });
  if (!res.ok) throw new Error("linkedin_status_failed " + res.status);
  return true;
}

export async function setCampaignDailyBudget(campaignId: string, amountCents: number, currency = "USD") {
  const { token } = cfg();
  const url = `https://api.linkedin.com/v2/adCampaignsV2/${campaignId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { 
      "Authorization": `Bearer ${token}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ dailyBudget: { amount: amountCents, currencyCode: currency } })
  });
  if (!res.ok) throw new Error("linkedin_budget_failed " + res.status);
  return true;
}