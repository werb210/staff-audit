import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const router = express.Router();

// ---- ENV & simple token store ---------------------------------------------
const {
  GADS_DEVELOPER_TOKEN,
  GADS_OAUTH_CLIENT_ID,
  GADS_OAUTH_CLIENT_SECRET,
  GADS_LOGIN_CUSTOMER_ID,
  GADS_REFRESH_TOKEN,
  APP_BASE_URL,
  OPENAI_API_KEY,
} = process.env;

const DATA_DIR = path.join(process.cwd(), "data");
const TOKEN_FILE = path.join(DATA_DIR, "google-ads-token.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readToken() {
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")); } catch { return null; }
}
function writeToken(obj) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(obj, null, 2), "utf8");
}

// Connected = we have a refresh token from env or file
function getRefreshToken() {
  const file = readToken();
  return (GADS_REFRESH_TOKEN && GADS_REFRESH_TOKEN.trim()) || file?.refresh_token || "";
}

// ---- Helpers ---------------------------------------------------------------
function requireEnv(res) {
  const missing = [];
  if (!GADS_DEVELOPER_TOKEN) missing.push("GADS_DEVELOPER_TOKEN");
  if (!GADS_OAUTH_CLIENT_ID) missing.push("GADS_OAUTH_CLIENT_ID");
  if (!GADS_OAUTH_CLIENT_SECRET) missing.push("GADS_OAUTH_CLIENT_SECRET");
  if (!APP_BASE_URL) missing.push("APP_BASE_URL");
  if (missing.length) {
    return res.status(428).json({ ok:false, error:"missing_env", missing });
  }
  return null;
}

function gadsHeaders(customerId) {
  const refresh = getRefreshToken();
  return {
    "developer-token": GADS_DEVELOPER_TOKEN,
    "login-customer-id": (customerId || GADS_LOGIN_CUSTOMER_ID || "").replace(/-/g, ""),
    "x-goog-api-client": "gl-node/18 gapic/ ads/16",
    "authorization": `Bearer ${refresh ? "ya29." : ""}` // placeholder; we use REST token exchange below
  };
}

// Token exchange via OAuth 2.0
async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    code,
    client_id: GADS_OAUTH_CLIENT_ID,
    client_secret: GADS_OAUTH_CLIENT_SECRET,
    redirect_uri: `${APP_BASE_URL}/api/ads/google/oauth/callback`,
    grant_type: "authorization_code",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    const t = await r.text().catch(()=> "");
    throw new Error(`oauth_token_exchange_failed: ${r.status} ${t}`);
  }
  return r.json();
}

async function refreshAccessToken(refresh_token) {
  const body = new URLSearchParams({
    client_id: GADS_OAUTH_CLIENT_ID,
    client_secret: GADS_OAUTH_CLIENT_SECRET,
    refresh_token,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`refresh_failed ${r.status}`);
  return r.json(); // { access_token, expires_in, token_type, scope }
}

async function authHeader() {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const tok = await refreshAccessToken(refresh);
  return `Bearer ${tok.access_token}`;
}

// ---- Public endpoints used by Marketing dashboard --------------------------

// Status (stops the 404 spam and powers the "Connect" card)
router.get("/api/ads/google/status", async (req,res) => {
  const envMissing = requireEnv(res); if (envMissing) return;
  const connected = !!getRefreshToken();
  res.json({
    ok:true,
    connected,
    login_customer_id: GADS_LOGIN_CUSTOMER_ID || null,
    has_ai: !!OPENAI_API_KEY,
    redirect_uri: `${APP_BASE_URL}/api/ads/google/oauth/callback`,
  });
});

// Begin OAuth
router.get("/api/ads/google/authorize", (req,res) => {
  const envMissing = requireEnv(res); if (envMissing) return;
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: GADS_OAUTH_CLIENT_ID,
    redirect_uri: `${APP_BASE_URL}/api/ads/google/oauth/callback`,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/adwords",
      "openid","email","profile"
    ].join(" "),
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// OAuth callback → persist refresh token
router.get("/api/ads/google/oauth/callback", async (req,res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing code");
    const tokens = await exchangeCodeForTokens(String(code));
    writeToken({ refresh_token: tokens.refresh_token });
    res.send(`<html><body><h3>Google Ads connected</h3><script>window.close&&window.close()</script></body></html>`);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// List accessible accounts (MCC tree)
router.get("/api/ads/google/accounts", async (req,res) => {
  try {
    const envMissing = requireEnv(res); if (envMissing) return;
    const bearer = await authHeader();
    if (!bearer) return res.status(409).json({ ok:false, error:"not_connected" });

    // Query via Google Ads Query Language to customer accounts
    // v16 REST searchStream endpoint
    const login = (GADS_LOGIN_CUSTOMER_ID || "").replace(/-/g,"");
    const url = `https://googleads.googleapis.com/v16/customers/${login}/googleAds:searchStream`;
    const body = { query: "SELECT customer_client.id, customer_client.descriptive_name, customer_client.status FROM customer_client WHERE customer_client.level <= 1" };

    const r = await fetch(url, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization": bearer,
        "developer-token": GADS_DEVELOPER_TOKEN,
        "login-customer-id": login
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const t = await r.text().catch(()=> "");
      return res.status(r.status).json({ ok:false, error:"google_error", detail:t });
    }
    const chunks = await r.json(); // stream chunks aggregated by fetch impl
    const accounts = [];
    for (const chunk of Array.isArray(chunks)?chunks:[chunks]) {
      for (const row of chunk.results || []) {
        const cc = row.customerClient || row.customer_client;
        if (cc) accounts.push({
          id: cc.id,
          name: cc.descriptiveName || cc.descriptive_name,
          status: cc.status
        });
      }
    }
    res.json({ ok:true, accounts });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// List campaigns for a customerId
router.get("/api/ads/google/campaigns", async (req,res) => {
  try {
    const customerId = String(req.query.customerId||"").replace(/-/g,"");
    if (!customerId) return res.status(400).json({ ok:false, error:"missing_customerId" });

    const bearer = await authHeader();
    if (!bearer) return res.status(409).json({ ok:false, error:"not_connected" });

    const url = `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`;
    const body = { query: "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, metrics.clicks, metrics.impressions, metrics.cost_micros FROM campaign ORDER BY campaign.id DESC" };

    const r = await fetch(url, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization": bearer,
        "developer-token": GADS_DEVELOPER_TOKEN,
        "login-customer-id": (GADS_LOGIN_CUSTOMER_ID||"").replace(/-/g,"")
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const t = await r.text().catch(()=> "");
      return res.status(r.status).json({ ok:false, error:"google_error", detail:t });
    }
    const chunks = await r.json();
    const campaigns = [];
    for (const chunk of Array.isArray(chunks)?chunks:[chunks]) {
      for (const row of chunk.results || []) {
        const c = row.campaign;
        const m = row.metrics || {};
        campaigns.push({
          id: c.id, name: c.name, status: c.status,
          channel: c.advertisingChannelType || c.advertising_channel_type,
          clicks: m.clicks, impressions: m.impressions,
          cost_micros: m.costMicros || m.cost_micros
        });
      }
    }
    res.json({ ok:true, campaigns });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ---- AI helpers (parity with HubSpot Ads panel) ----------------------------
router.post("/api/ads/google/ai/copy", express.json(), async (req,res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(501).json({ ok:false, error:"ai_unconfigured" });
    const { product, audience, tone="professional", count=6 } = req.body || {};
    const prompt = `
Generate ${count} Google Ads headlines (max 30 chars) and descriptions (max 90 chars)
for the product: "${product}". Audience: ${audience || "SMB owners"}.
Tone: ${tone}. Return JSON {items:[{headline, description}]}.
`;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{role:"user", content:prompt}],
        temperature: 0.7
      })
    });
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content || "{}";
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = { items: [] }; }
    res.json({ ok:true, ...parsed });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

router.post("/api/ads/google/ai/audiences", express.json(), async (req,res) => {
  if (!OPENAI_API_KEY) return res.status(501).json({ ok:false, error:"ai_unconfigured" });
  const { niche, region="US/CA", count=5 } = req.body || {};
  const prompt = `Suggest ${count} high-intent audience segment ideas for Google Ads for niche "${niche}". Region: ${region}. Return JSON {segments:[{name, rationale}]}.`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model:"gpt-4o-mini", messages:[{role:"user", content:prompt}], temperature:0.5 })
  });
  const j = await r.json();
  const text = j?.choices?.[0]?.message?.content || "{}";
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = { segments: [] }; }
  res.json({ ok:true, ...parsed });
});

router.post("/api/ads/google/ai/budget", express.json(), async (req,res) => {
  if (!OPENAI_API_KEY) return res.status(501).json({ ok:false, error:"ai_unconfigured" });
  const { goal="leads", monthlyBudget=3000, cpaTarget=60 } = req.body || {};
  const prompt = `Recommend a Google Ads budget split for goal "${goal}" with total ${monthlyBudget} USD and target CPA ${cpaTarget}. Return JSON {plan:[{channel, percent, rationale}], notes}.`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model:"gpt-4o-mini", messages:[{role:"user", content:prompt}], temperature:0.3 })
  });
  const j = await r.json();
  const text = j?.choices?.[0]?.message?.content || "{}";
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = { plan: [], notes: "" }; }
  res.json({ ok:true, ...parsed });
});

export default router;