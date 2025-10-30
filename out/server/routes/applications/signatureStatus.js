// server/routes/applications/signatureStatus.ts
import { Router } from "express";
import { db } from "../../db";
import { applications } from "../../../shared/schema";
import { eq } from "drizzle-orm";
export const signatureStatusRouter = Router();
signatureStatusRouter.get("/:id/signature-status", async (req, res) => {
    const appId = req.params.id;
    if (!appId) {
        return res.status(400).json({ success: false, error: "Missing application ID" });
    }
    try {
        const app = await db.query.applications.findFirst({
            where: eq(applications.id, appId),
        });
        if (!app) {
            return res.status(404).json({ success: false, error: "Application not found" });
        }
        return res.json({
            success: true,
            applicationId: app.id,
            signing_status: app.signingStatus || 'not_required',
            signed_at: app.signedAt,
        });
    }
    catch (error) {
        console.error('Error fetching signature status:', error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
});
