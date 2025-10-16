import { request } from "undici";
import { google } from "googleapis";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getAccessToken() {
  const { rows } = await pool.query("SELECT * FROM google_ads_integrations WHERE id='default'");
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, 
    process.env.GOOGLE_CLIENT_SECRET, 
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials({ refresh_token: rows[0]?.refresh_token });
  const { credentials } = await oauth2.refreshAccessToken();
  return credentials.access_token!;
}

async function createConversions() {
  if (process.env.ADS_KILL_SWITCH === "1") {
    throw new Error("Kill switch is ON - set ADS_KILL_SWITCH=0 to proceed");
  }
  
  const token = await getAccessToken();
  const dev = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
  const cid = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!;
  const url = `https://googleads.googleapis.com/v16/customers/${cid}/conversionActions:mutate`;

  const operations = ["Lead Submitted", "Qualified Lead", "Deal Funded"].map(name => ({
    create: {
      name,
      type: "UPLOAD_CLICKS",       // offline via click ids
      category: name === "Deal Funded" ? "PURCHASE" : "LEAD",
      status: "ENABLED",
      valueSettings: { 
        defaultValue: 0, 
        alwaysUseDefaultValue: false 
      }
    }
  }));

  console.log(`Creating ${operations.length} conversion actions for customer ${cid}...`);

  const { body } = await request(url, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`, 
      "developer-token": dev, 
      "login-customer-id": cid, 
      "content-type": "application/json" 
    },
    body: JSON.stringify({ customerId: cid, operations })
  });

  const result = await body.text();
  console.log("Conversion actions creation result:");
  console.log(result);
  
  // Parse and display resource names for environment setup
  try {
    const parsed = JSON.parse(result);
    if (parsed.results) {
      console.log("\n🎯 Add these to your environment variables:");
      parsed.results.forEach((r: any, i: number) => {
        const stage = ["LEAD", "QUALIFIED", "FUNDED"][i];
        console.log(`GOOGLE_ADS_CONV_${stage}="${r.resourceName}"`);
      });
    }
  } catch (e) {
    console.log("Raw response (not JSON):", result);
  }
}

createConversions()
  .then(() => {
    console.log("✅ Conversion actions setup complete");
    process.exit(0);
  })
  .catch(e => { 
    console.error("❌ Error:", e.message); 
    process.exit(1); 
  });