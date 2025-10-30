import { Router } from "express";
import { requireAuth } from "../../auth/verifyOnly";
import { db } from "../../db/drizzle";
import { automationSequences, sequenceSteps } from "../../db/schema";
import { eq } from "drizzle-orm";
const r = Router();
r.use(requireAuth);
// Create automation sequence
r.post("/sequences", async (req, res) => {
    try {
        const { name, trigger, steps } = req.body;
        const [sequence] = await db.insert(automationSequences).values({
            name,
            trigger,
            isActive: true,
            createdBy: req.user.sub
        }).returning();
        // Insert steps
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            await db.insert(sequenceSteps).values({
                sequenceId: sequence.id,
                stepOrder: i + 1,
                stepType: step.type, // 'sms', 'email', 'linkedin', 'wait', 'task'
                delay: step.delay || 0,
                content: step.content,
                meta: step.meta || {}
            });
        }
        res.json({ ok: true, sequence });
    }
    catch (error) {
        console.error('Create sequence error:', error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// List sequences
r.get("/sequences", async (_req, res) => {
    const sequences = await db.select().from(automationSequences);
    res.json({ ok: true, sequences });
});
// Execute sequence for contact
r.post("/sequences/:id/execute", async (req, res) => {
    try {
        const sequenceId = req.params.id;
        const { contactId } = req.body;
        // Get sequence steps
        const steps = await db.select().from(sequenceSteps)
            .where(eq(sequenceSteps.sequenceId, sequenceId))
            .orderBy(sequenceSteps.stepOrder);
        let currentDelay = 0;
        for (const step of steps) {
            setTimeout(async () => {
                switch (step.stepType) {
                    case 'sms':
                        // Queue SMS (would integrate with Twilio)
                        console.log(`SMS to contact ${contactId}: ${step.content}`);
                        break;
                    case 'email':
                        // Queue email (would integrate with SendGrid/Graph)
                        console.log(`Email to contact ${contactId}: ${step.content}`);
                        break;
                    case 'linkedin':
                        // Manual step - create task for user
                        console.log(`LinkedIn action required for contact ${contactId}`);
                        break;
                    case 'task':
                        // Create task
                        console.log(`Task created: ${step.content}`);
                        break;
                }
            }, currentDelay);
            currentDelay += step.delay * 1000; // Convert seconds to milliseconds
        }
        res.json({ ok: true, message: "Sequence execution started" });
    }
    catch (error) {
        console.error('Execute sequence error:', error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
export default r;
