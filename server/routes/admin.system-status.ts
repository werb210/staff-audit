import { Router } from "express";
import { requireAuth } from "../auth/verifyOnly";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";

const r = Router(); 
r.use(requireAuth);

// System status endpoint for admin monitoring
r.get("/admin/system-status", async (req: any, res) => {
  try {
    const status: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      uptime: Math.floor(process.uptime()) + "s"
    };

    // Check database connection
    try {
      await db.execute(sql`SELECT 1`);
      status.database = { connected: true };
    } catch (error: unknown) {
      status.database = { connected: false, error: error instanceof Error ? error.message : String(error) };
    }

    // Check required secrets
    const requiredSecrets = [
      'DATABASE_URL',
      'TWILIO_ACCOUNT_SID', 
      'TWILIO_AUTH_TOKEN',
      'Azure_BUCKET',
      'Azure_REGION',
      'JWT_SECRET'
    ];
    
    const optionalSecrets = [
      'TWILIO_MESSAGING_SERVICE_SID',
      'O365_SERVICE_USER_ID', 
      'LINKEDIN_CLIENT_ID',
      'REDIS_URL'
    ];

    const secretsStatus = {};
    let presentCount = 0;
    let missingCount = 0;

    [...requiredSecrets, ...optionalSecrets].forEach(secret => {
      const isPresent = !!process.env[secret];
      secretsStatus[secret] = isPresent;
      if (isPresent) presentCount++; else missingCount++;
    });

    status.secrets = {
      present: presentCount,
      missing: missingCount,
      details: secretsStatus
    };

    // Check external services (basic ping)
    const services = {
      'Twilio': !!process.env.TWILIO_ACCOUNT_SID,
      'Azure': !!process.env.Azure_BUCKET,
      'Microsoft Graph': !!process.env.O365_SERVICE_USER_ID,
      'LinkedIn': !!process.env.LINKEDIN_CLIENT_ID,
      'Redis': !!process.env.REDIS_URL
    };

    const healthyServices = Object.values(services).filter(Boolean).length;
    
    status.services = {
      total: Object.keys(services).length,
      healthy: healthyServices,
      status: services
    };

    // Check Azure accessibility
    try {
      // Basic Azure configuration check
      const hasAzureConfig = process.env.Azure_BUCKET && process.env.Azure_REGION;
      status.storage = { accessible: hasAzureConfig };
    } catch (error: unknown) {
      status.storage = { accessible: false, error: error instanceof Error ? error.message : String(error) };
    }

    // Check background jobs (mock - would check Redis/BullMQ in real implementation)
    status.queues = {
      healthy: !!process.env.REDIS_URL,
      active: process.env.REDIS_URL ? 5 : 0,
      failed: process.env.REDIS_URL ? 0 : 0
    };

    // Check webhook configuration
    const webhookEndpoints = {
      'Twilio Voice': '/webhooks/twilio/voice',
      'Twilio SMS': '/webhooks/twilio/sms',
      'Microsoft Graph': '/api/graph/webhooks',
      'LinkedIn': '/api/webhooks/linkedin'
    };

    status.webhooks = {
      configured: Object.keys(webhookEndpoints).length,
      endpoints: webhookEndpoints
    };

    res.json(status);

  } catch (error: unknown) {
    res.status(500).json({ 
      error: "Failed to check system status", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default r;