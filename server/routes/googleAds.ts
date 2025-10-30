import { Router } from "express";
import { google } from "googleapis";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { request } from "undici";

const router = Router();

const SCOPES = ["https://www.googleapis.com/auth/adwords"];
const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
);

// Helper functions for token management
async function getTokens() {
  try {
    const result = await db.execute(`SELECT * FROM google_ads_integrations WHERE id='default'`);
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.error('Error getting tokens:', error);
    return null;
  }
}

async function saveTokens(tokens: any) {
  try {
    await db.execute(`
      INSERT INTO google_ads_integrations (id, refresh_token, access_token, token_expiry, login_customer_id, developer_token, updatedAt)
      VALUES ('default', $1, $2, $3, $4, $5, now())
      ON CONFLICT (id) DO UPDATE SET
        refresh_token = EXCLUDED.refresh_token,
        access_token = EXCLUDED.access_token,
        token_expiry = EXCLUDED.token_expiry,
        login_customer_id = EXCLUDED.login_customer_id,
        developer_token = EXCLUDED.developer_token,
        updatedAt = now()
    `, [
      tokens.refresh_token || null,
      tokens.access_token || null,
      tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || null,
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN || null,
    ]);
  } catch (error: unknown) {
    console.error('Error saving tokens:', error);
    throw error;
  }
}

async function getAccessToken() {
  const current = await getTokens();
  if (current?.refresh_token) {
    oauth2.setCredentials({ refresh_token: current.refresh_token });
    const { credentials } = await oauth2.refreshAccessToken();
    await saveTokens(credentials);
    return credentials.access_token!;
  }
  return current?.access_token; // first run after callback
}

// 1) Get OAuth consent URL
router.get("/auth/url", async (_req, res) => {
  try {
    const url = oauth2.generateAuthUrl({ 
      access_type: "offline", 
      prompt: "consent", 
      scope: SCOPES 
    });
    res.json({ url });
  } catch (error: unknown) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// 2) OAuth callback
router.get("/callback", async (req: any, res: any) => {
  try {
    const code = String(req.query.code || "");
    if (!code) {
      return res.status(400).send('<html><body>Error: No authorization code received</body></html>');
    }
    
    const { tokens } = await oauth2.getToken(code);
    await saveTokens(tokens);
    res.send(`<html><body><h2>✅ Google Ads Successfully Linked!</h2><p>You can close this tab and return to the application.</p></body></html>`);
  } catch (error: unknown) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`<html><body><h2>❌ OAuth Error</h2><p>${error instanceof Error ? error.message : String(error)}</p></body></html>`);
  }
});

// 3) Authentication status
router.get("/auth/status", async (_req, res) => {
  try {
    const tokens = await getTokens();
    res.json({ 
      linked: !!tokens?.refresh_token, 
      loginCustomerId: tokens?.login_customer_id || null,
      hasDevToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      killSwitch: process.env.ADS_KILL_SWITCH === "1",
      sandboxMode: process.env.ADS_SANDBOX_MODE === "1"
    });
  } catch (error: unknown) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

// 4) List accessible accounts (API verification)
router.get("/accounts", async (_req, res) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated with Google Ads' });
    }

    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
    if (!devToken) {
      return res.status(400).json({ error: 'Developer token not configured' });
    }

    const response = await request(
      `https://googleads.googleapis.com/v16/customers:listAccessibleCustomers`,
      { 
        method: "GET", 
        headers: { 
          Authorization: `Bearer ${accessToken}`, 
          "developer-token": devToken 
        } 
      }
    );

    const data = await response.body.json();
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// 5) Create conversion actions
router.post("/conversion-actions", async (_req, res) => {
  try {
    if (process.env.ADS_KILL_SWITCH === "1") {
      return res.status(403).json({ error: "Kill switch is enabled" });
    }

    const accessToken = await getAccessToken();
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
    const customerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!;
    
    const url = `https://googleads.googleapis.com/v16/customers/${customerId}/conversionActions:mutate`;

    const operations = ["Lead Submitted", "Qualified Lead", "Deal Funded"].map(name => ({
      create: {
        name,
        type: "UPLOAD_CLICKS",
        category: name === "Deal Funded" ? "PURCHASE" : "LEAD",
        status: "ENABLED",
        valueSettings: { 
          defaultValue: 0, 
          alwaysUseDefaultValue: false 
        }
      }
    }));

    const response = await request(url, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${accessToken}`, 
        "developer-token": devToken, 
        "login-customer-id": customerId, 
        "content-type": "application/json" 
      },
      body: JSON.stringify({ 
        customerId, 
        operations 
      })
    });

    const result = await response.body.json();
    res.json(result);
  } catch (error: any) {
    console.error('Error creating conversion actions:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;