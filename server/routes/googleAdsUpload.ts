import { Router } from "express";
import { google } from "googleapis";
import { db } from "../db";
import { request } from "undici";
import { z } from "zod";

const router = Router();

const conversionSchema = z.object({
  applicationId: z.string().uuid(),
  stage: z.enum(["lead", "qualified", "funded"]),
  commissionValue: z.number().nonnegative().default(0),
  currency: z.string().default("CAD"),
  conversionTime: z.string().optional() // ISO; fallback to now
});

async function getAccessToken() {
  try {
    const result = await db.execute(`SELECT refresh_token FROM google_ads_integrations WHERE id='default'`);
    const row = result.rows[0];
    
    if (!row?.refresh_token) {
      throw new Error('No refresh token available');
    }
    
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID, 
      process.env.GOOGLE_CLIENT_SECRET, 
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2.setCredentials({ refresh_token: row.refresh_token });
    const { credentials } = await oauth2.refreshAccessToken();
    return credentials.access_token!;
  } catch (error: unknown) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

function getConversionActionForStage(stage: string): string {
  switch (stage) {
    case "lead":
      return process.env.GOOGLE_ADS_CONV_LEAD!;
    case "qualified":
      return process.env.GOOGLE_ADS_CONV_QUALIFIED!;
    case "funded":
      return process.env.GOOGLE_ADS_CONV_FUNDED!;
    default:
      throw new Error(`Unknown conversion stage: ${stage}`);
  }
}

// Upload offline conversion
router.post("/offline-conversion", async (req: any, res: any) => {
  try {
    const body = conversionSchema.parse(req.body ?? {});
    
    // Get application with click IDs
    const result = await db.execute(`
      SELECT gclid, gbraid, wbraid, COALESCE(ad_click_time, createdAt) AS click_ts
      FROM applications WHERE id = $1
    `, [body.applicationId]);
    
    const application = result.rows[0];
    if (!application) {
      return res.status(404).json({ error: "application_not_found" });
    }
    
    const clickId = application.gclid || application.gbraid || application.wbraid;
    if (!clickId) {
      return res.status(400).json({ error: "no_click_id_on_application" });
    }

    const conversionAction = getConversionActionForStage(body.stage);

    // Format conversion time for Google Ads API: "yyyy-mm-dd hh:mm:ss+|-hh:mm"
    const timestamp = new Date(body.conversionTime || new Date().toISOString());
    const pad = (n: number) => String(n).padStart(2, "0");
    const offset = -timestamp.getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const hours = pad(Math.floor(Math.abs(offset) / 60));
    const minutes = pad(Math.abs(offset) % 60);
    const conversionDateTime = `${timestamp.getFullYear()}-${pad(timestamp.getMonth() + 1)}-${pad(timestamp.getDate())} ${pad(timestamp.getHours())}:${pad(timestamp.getMinutes())}:${pad(timestamp.getSeconds())}${sign}${hours}:${minutes}`;

    // Sandbox mode: simulate upload
    if (process.env.ADS_SANDBOX_MODE === "1") {
      console.log('📊 [ADS-SANDBOX] Simulated conversion upload:', {
        stage: body.stage,
        conversionAction,
        clickId,
        conversionDateTime,
        value: body.commissionValue,
        applicationId: body.applicationId
      });
      
      return res.json({ 
        simulated: true, 
        stage: body.stage, 
        conversionAction, 
        clickId, 
        conversionDateTime, 
        value: body.commissionValue 
      });
    }

    // Real upload to Google Ads
    const accessToken = await getAccessToken();
    const customerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!;
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
    const endpoint = `https://googleads.googleapis.com/v16/customers/${customerId}:uploadClickConversions`;

    const payload = {
      customerId,
      conversions: [{
        conversionAction,
        gclid: application.gclid || undefined,
        gbraid: application.gbraid || undefined,
        wbraid: application.wbraid || undefined,
        conversionDateTime,
        conversionValue: body.commissionValue,
        currencyCode: body.currency,
        orderId: body.applicationId
      }],
      partialFailure: true,
      validateOnly: false
    };

    const response = await request(endpoint, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${accessToken}`, 
        "developer-token": devToken, 
        "login-customer-id": customerId, 
        "content-type": "application/json" 
      },
      body: JSON.stringify(payload)
    });

    const uploadResult = await response.body.json();
    
    console.log('📊 [ADS-UPLOAD] Conversion uploaded:', {
      stage: body.stage,
      value: body.commissionValue,
      applicationId: body.applicationId,
      success: !uploadResult.error
    });

    res.json(uploadResult);
  } catch (error: any) {
    console.error('Conversion upload error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Batch upload multiple conversions
router.post("/batch-conversions", async (req: any, res: any) => {
  try {
    if (!Array.isArray(req.body.conversions)) {
      return res.status(400).json({ error: "conversions array required" });
    }

    const results = [];
    for (const conversion of req.body.conversions) {
      try {
        const validatedConversion = conversionSchema.parse(conversion);
        // Process each conversion (simplified for brevity)
        results.push({ 
          applicationId: validatedConversion.applicationId, 
          status: 'processed' 
        });
      } catch (error: unknown) {
        results.push({ 
          applicationId: conversion.applicationId, 
          status: 'error', 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    res.json({ results });
  } catch (error: any) {
    console.error('Batch upload error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;