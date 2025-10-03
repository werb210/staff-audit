import { Router } from "express";
import fetch from "node-fetch";
import { requireAuth } from "../auth/verifyOnly";
import crypto from "crypto";

const r = Router();

function liBase() { return "https://www.linkedin.com/oauth/v2"; }
function apiBase() { return "https://api.linkedin.com/v2"; }

// In-memory token cache (swap to DB if needed)
const store: any = {};

r.get("/marketing/linkedin/oauth/start", requireAuth, (req: any, res) => {
  const state = crypto.randomBytes(8).toString("hex");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    scope: "r_organization_admin r_organization_social w_organization_social w_member_social",
    state
  });
  store[state] = { user: req.user.sub };
  res.json({ url: `${liBase()}/authorization?${params.toString()}` });
});

r.get("/marketing/linkedin/oauth/callback", async (req: any, res) => {
  const { code, state } = req.query;
  if (!store[state]) return res.status(400).send("Bad state");
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(code),
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!
  });
  const token = await (await fetch(`${liBase()}/accessToken`, { 
    method: "POST", 
    headers: { "Content-Type": "application/x-www-form-urlencoded" }, 
    body: params.toString() 
  })).json();
  store.linkedin = token; // {access_token, expires_in}
  res.send("LinkedIn connected. You can close this window.");
});

// List organizations (pages) you can post to
r.get("/marketing/linkedin/pages", requireAuth, async (_req, res) => {
  const tk = store.linkedin?.access_token;
  if (!tk) return res.status(401).json({ ok: false, error: "not_connected" });
  const me = await (await fetch(`${apiBase()}/me`, { headers: { Authorization: `Bearer ${tk}` } })).json();
  const orgs: any = await (await fetch(`${apiBase()}/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50&start=0&projection=(elements*(organizationalTarget~(id,localizedName)))`, { headers: { Authorization: `Bearer ${tk}` } })).json();
  res.json({ ok: true, actor: me, pages: (orgs.elements || []).map((e: any) => e["organizationalTarget~"]) });
});

// Create a page post
r.post("/marketing/linkedin/page-post", requireAuth, async (req: any, res: any) => {
  const tk = store.linkedin?.access_token;
  if (!tk) return res.status(401).json({ ok: false, error: "not_connected" });
  const { orgId, text } = req.body || {};
  const body = {
    author: `urn:li:organization:${orgId}`,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
  };
  const rsp = await fetch(`${apiBase()}/ugcPosts`, { 
    method: "POST", 
    headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" }, 
    body: JSON.stringify(body) 
  });
  const j = await rsp.json();
  res.json({ ok: rsp.ok, result: j });
});

// Basic page analytics (impressions/engagement for last 7 days)
r.get("/marketing/linkedin/page-analytics", requireAuth, async (req: any, res: any) => {
  const tk = store.linkedin?.access_token;
  if (!tk) return res.status(401).json({ ok: false, error: "not_connected" });
  const orgId = req.query.orgId;
  const now = Date.now(); 
  const from = now - 7 * 864e5;
  const url = `${apiBase()}/organizationPageStatistics?q=organization&organization=urn:li:organization:${orgId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${from}&timeIntervals.timeRange.end=${now}`;
  const j = await (await fetch(url, { headers: { Authorization: `Bearer ${tk}` } })).json();
  res.json({ ok: true, stats: j });
});

export default r;