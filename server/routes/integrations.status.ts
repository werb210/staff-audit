import type { Express, Request, Response } from "express";
export function mountIntegrationStatus(app: Express) {
  app.get("/integrations/status", (req: Request, res: Response) => {
    res.json({
      ok: true,
      sendgrid: !!process.env.SENDGRID_API_KEY,
      s3: !!process.env.AWS_S3_BUCKET && !!process.env.AWS_ACCESS_KEY_ID,
      googleAds: !!process.env.GADS_CLIENT_ID,
      m365: !!process.env.MS_TENANT_ID,
      linkedin: !!process.env.LINKEDIN_CLIENT_ID,
      twilioBF: !!process.env.TWILIO_BF_ACCOUNT_SID,
      twilioSLF: !!process.env.TWILIO_SLF_ACCOUNT_SID,
    });
  });
}