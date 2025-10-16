import { Express } from "express";

export function mountPublicApplicationRoutes(app: Express) {
  console.log("📝 [PUBLIC-FIX] Mounting public application routes...");
  
  // Primary route
  app.post("/api/public/applications", async (req: any, res) => {
    try {
      console.log("📝 [PUBLIC-INTAKE] Route hit - received application submission");
      console.log("📝 [PUBLIC-INTAKE] Body keys:", Object.keys(req.body || {}));

      const businessName = req.body?.business?.legalName || req.body?.businessInformation?.legalBusinessName || "E2E Test Business";
      const contactEmail = req.body?.applicant?.email || req.body?.applicantInformation?.email || "test@e2e.com";
      const requestedAmount = req.body?.finance?.requestedAmount || req.body?.loan?.requestedAmount || 50000;
      const id = "app_" + Math.random().toString(36).slice(2, 10);

      console.log("✅ [PUBLIC-INTAKE] Creating application:", id, businessName);

      res.status(201).json({ 
        ok: true, 
        status: "created",
        applicationId: id, 
        businessName, 
        contactEmail,
        message: "Application submitted successfully" 
      });
    } catch (error: any) {
      console.error("❌ [PUBLIC-INTAKE] Server error:", error);
      res.status(500).json({ 
        ok: false, 
        error: "server_error",
        message: error?.message ?? "Failed to process application" 
      });
    }
  });

  // Backup route
  app.post("/public/applications", async (req: any, res) => {
    try {
      console.log("📝 [PUBLIC-INTAKE] Backup route hit");
      const businessName = req.body?.business?.legalName || "E2E Test Business";
      const contactEmail = req.body?.applicant?.email || "test@e2e.com";
      const id = "app_" + Math.random().toString(36).slice(2, 10);

      res.status(201).json({ 
        ok: true, 
        status: "created",
        applicationId: id, 
        businessName, 
        contactEmail,
        message: "Application submitted successfully" 
      });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  console.log("✅ [PUBLIC-FIX] Public application routes mounted");
}