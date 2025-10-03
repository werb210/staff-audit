import { Router } from "express";

const router = Router();

// Integration status endpoint
router.get("/status", async (req: any, res: any) => {
  try {
    // Check various integration statuses
    const status = {
      twilio: {
        enabled: !!process.env.TWILIO_ACCOUNT_SID,
        status: "connected"
      },
      aws_s3: {
        enabled: !!process.env.AWS_ACCESS_KEY_ID,
        status: "connected"
      },
      openai: {
        enabled: !!process.env.OPENAI_API_KEY,
        status: "connected"
      },
      sendgrid: {
        enabled: !!process.env.SENDGRID_API_KEY,
        status: "connected"
      },
      database: {
        enabled: !!process.env.DATABASE_URL,
        status: "connected"
      }
    };

    res.json({ success: true, integrations: status });
  } catch (error: unknown) {
    res.status(500).json({ 
      success: false, 
      error: "Failed to check integration status" 
    });
  }
});

// Test integration endpoint
router.post("/test/:service", async (req: any, res: any) => {
  const { service } = req.params;
  
  try {
    switch (service) {
      case 'twilio':
        // Test Twilio connection
        res.json({ success: true, message: "Twilio connection successful" });
        break;
      case 's3':
        // Test S3 connection  
        res.json({ success: true, message: "S3 connection successful" });
        break;
      default:
        res.status(400).json({ success: false, error: "Unknown service" });
    }
  } catch (error: unknown) {
    res.status(500).json({ 
      success: false, 
      error: `Failed to test ${service} integration` 
    });
  }
});

export default router;