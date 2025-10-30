import { Router } from "express";
import { requireAuth } from "../../auth/verifyOnly";
import { db } from "../../db/drizzle";
import { applications, comms } from "../../db/schema";
import { sql, inArray } from "drizzle-orm";
const r = Router();
r.use(requireAuth);
// Bulk move applications to stage
r.post("/move", async (req, res) => {
    try {
        const { applicationIds, targetStage, reason } = req.body;
        if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({ ok: false, error: "No applications selected" });
        }
        // Stage gate validation
        const stageGateErrors = [];
        for (const appId of applicationIds) {
            const validation = await validateStageGate(appId, targetStage);
            if (!validation.valid) {
                stageGateErrors.push({ applicationId: appId, error: validation.error });
            }
        }
        if (stageGateErrors.length > 0) {
            return res.status(400).json({
                ok: false,
                error: "Stage gate validation failed",
                details: stageGateErrors
            });
        }
        // Update applications
        await db.update(applications)
            .set({
            stage: targetStage,
            updatedAt: new Date()
        })
            .where(inArray(applications.id, applicationIds));
        // Log bulk action
        for (const appId of applicationIds) {
            await db.insert(comms).values({
                applicationId: appId,
                kind: 'activity',
                direction: 'system',
                body: `Application moved to ${targetStage} via bulk operation${reason ? `: ${reason}` : ''}`,
                createdBy: req.user.sub
            });
        }
        res.json({ ok: true, updated: applicationIds.length });
    }
    catch (error) {
        console.error('Bulk move error:', error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Bulk assign lender
r.post("/assign-lender", async (req, res) => {
    try {
        const { applicationIds, lenderId } = req.body;
        await db.execute(sql `
      UPDATE applications 
      SET assigned_lender_id = ${lenderId},
          updatedAt = NOW()
      WHERE id = ANY(${applicationIds})
    `);
        res.json({ ok: true, updated: applicationIds.length });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Bulk archive/delete
r.post("/archive", async (req, res) => {
    try {
        const { applicationIds, permanent = false } = req.body;
        if (permanent) {
            await db.execute(sql `DELETE FROM applications WHERE id = ANY(${applicationIds})`);
        }
        else {
            await db.update(applications)
                .set({ status: 'archived' })
                .where(inArray(applications.id, applicationIds));
        }
        res.json({ ok: true, archived: applicationIds.length });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
async function validateStageGate(applicationId, targetStage) {
    // Stage gate rules
    switch (targetStage) {
        case 'lender':
            // Check all documents are accepted
            const { rows } = await db.execute(sql `
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted
        FROM documents 
        WHERE applicationId = ${applicationId}
      `);
            const counts = rows[0];
            if (counts.total === 0) {
                return { valid: false, error: "No documents uploaded" };
            }
            if (counts.accepted < counts.total) {
                return { valid: false, error: "Not all documents are accepted" };
            }
            break;
        case 'accepted':
            // Check lender assignment
            const [app] = await db.select().from(applications).where(sql `id = ${applicationId}`);
            if (!app?.assignedLenderId) {
                return { valid: false, error: "No lender assigned" };
            }
            break;
    }
    return { valid: true };
}
export default r;
