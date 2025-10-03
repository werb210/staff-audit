// Feature 8: External System Integration Webhooks
import { Router } from "express";
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/rbacAuth.js";

const router = Router();

// Webhook configuration endpoint
router.post("/configure", async (req: any, res: any) => {
  try {
    const { webhookUrl, events, secretKey } = req.body;
    
    if (!webhookUrl || !events || !Array.isArray(events)) {
      return res.status(400).json({ 
        error: "webhookUrl and events array are required" 
      });
    }
    
    // Store webhook configuration (in production, this would be in database)
    const webhookConfig = {
      url: webhookUrl,
      events,
      secretKey,
      createdAt: new Date(),
      isActive: true,
    };
    
    // Store in environment variables for now
    process.env.DOCUMENT_WEBHOOK_URL = webhookUrl;
    process.env.DOCUMENT_WEBHOOK_EVENTS = JSON.stringify(events);
    process.env.DOCUMENT_WEBHOOK_SECRET = secretKey;
    
    console.log(`📤 [WEBHOOK] Configured webhook: ${webhookUrl} for events: ${events.join(', ')}`);
    
    res.json({ 
      success: true, 
      webhook: webhookConfig,
      supportedEvents: [
        "document.uploaded",
        "document.verified",
        "document.rejected", 
        "document.ocr_completed",
        "document.banking_analyzed",
        "document.backup_completed",
        "document.version_created"
      ]
    });
  } catch (error: unknown) {
    console.error("Error configuring webhook:", error);
    res.status(500).json({ error: "Failed to configure webhook" });
  }
});

// Send webhook notification
export async function sendWebhookNotification(event: string, data: any): Promise<void> {
  try {
    const webhookUrl = process.env.DOCUMENT_WEBHOOK_URL;
    const webhookEvents = process.env.DOCUMENT_WEBHOOK_EVENTS 
      ? JSON.parse(process.env.DOCUMENT_WEBHOOK_EVENTS) 
      : [];
    const secretKey = process.env.DOCUMENT_WEBHOOK_SECRET;
    
    if (!webhookUrl || !webhookEvents.includes(event)) {
      return; // No webhook configured or event not subscribed
    }
    
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Boreal-Document-System/1.0',
    };
    
    // Add signature if secret key is configured
    if (secretKey) {
      const crypto = await import('crypto');
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Boreal-Signature'] = `sha256=${signature}`;
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      console.log(`📤 [WEBHOOK] Successfully sent ${event} notification`);
    } else {
      console.error(`📤 [WEBHOOK] Failed to send ${event} notification: ${response.status}`);
    }
  } catch (error: unknown) {
    console.error(`📤 [WEBHOOK] Error sending ${event} notification:`, error);
  }
}

// Test webhook endpoint
router.post("/test", async (req: any, res: any) => {
  try {
    const testData = {
      applicationId: "test-application-id",
      documentId: "test-document-id",
      fileName: "test-document.pdf",
      documentType: "test_document",
      timestamp: new Date().toISOString(),
    };
    
    await sendWebhookNotification("document.test", testData);
    
    res.json({ 
      success: true, 
      message: "Test webhook sent",
      testData
    });
  } catch (error: unknown) {
    console.error("Error sending test webhook:", error);
    res.status(500).json({ error: "Failed to send test webhook" });
  }
});

// Get webhook status
router.get("/status", async (req: any, res: any) => {
  try {
    const webhookUrl = process.env.DOCUMENT_WEBHOOK_URL;
    const webhookEvents = process.env.DOCUMENT_WEBHOOK_EVENTS 
      ? JSON.parse(process.env.DOCUMENT_WEBHOOK_EVENTS) 
      : [];
    
    const status = {
      configured: !!webhookUrl,
      url: webhookUrl || null,
      events: webhookEvents,
      hasSecret: !!process.env.DOCUMENT_WEBHOOK_SECRET,
    };
    
    res.json(status);
  } catch (error: unknown) {
    console.error("Error getting webhook status:", error);
    res.status(500).json({ error: "Failed to get webhook status" });
  }
});

export default router;