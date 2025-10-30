import { Router } from "express";
import { requireAuth } from "../../auth/verifyOnly";
import { db } from "../../db/drizzle";
import { experiments, experimentVariants, experimentParticipants } from "../../db/schema";
import { eq, sql } from "drizzle-orm";
const r = Router();
r.use(requireAuth);
// Create A/B test experiment
r.post("/", async (req, res) => {
    try {
        const { name, description, type, trafficSplit } = req.body;
        const [experiment] = await db.insert(experiments).values({
            name,
            description,
            type, // 'ab_test', 'multivariate', 'feature_flag'
            status: 'draft',
            trafficSplit,
            createdBy: req.user.sub
        }).returning();
        res.json({ ok: true, experiment });
    }
    catch (error) {
        console.error('Create experiment error:', error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Add variant to experiment
r.post("/:id/variants", async (req, res) => {
    try {
        const experimentId = req.params.id;
        const { name, config, weight } = req.body;
        const [variant] = await db.insert(experimentVariants).values({
            experimentId,
            name,
            config,
            weight: weight || 50
        }).returning();
        res.json({ ok: true, variant });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Get experiment for user (assigns variant if needed)
r.get("/:id/assign/:userId", async (req, res) => {
    try {
        const { id: experimentId, userId } = req.params;
        // Check if user already assigned
        let [participant] = await db.select().from(experimentParticipants)
            .where(eq(experimentParticipants.experimentId, experimentId))
            .where(eq(experimentParticipants.userId, userId));
        if (!participant) {
            // Get variants with weights
            const variants = await db.select().from(experimentVariants)
                .where(eq(experimentVariants.experimentId, experimentId));
            if (variants.length === 0) {
                return res.status(400).json({ ok: false, error: "No variants configured" });
            }
            // Weighted random selection
            const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
            let random = Math.random() * totalWeight;
            let selectedVariant = variants[0];
            for (const variant of variants) {
                random -= variant.weight;
                if (random <= 0) {
                    selectedVariant = variant;
                    break;
                }
            }
            // Assign user to variant
            [participant] = await db.insert(experimentParticipants).values({
                experimentId,
                userId,
                variantId: selectedVariant.id,
                assignedAt: new Date()
            }).returning();
        }
        res.json({ ok: true, participant });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Record conversion
r.post("/:id/convert/:userId", async (req, res) => {
    try {
        const { id: experimentId, userId } = req.params;
        const { event } = req.body;
        await db.execute(sql `
      UPDATE experiment_participants 
      SET converted_at = NOW(), 
          conversion_event = ${event}
      WHERE experiment_id = ${experimentId} 
        AND user_id = ${userId} 
        AND converted_at IS NULL
    `);
        res.json({ ok: true, message: "Conversion recorded" });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
// Get experiment results
r.get("/:id/results", async (req, res) => {
    try {
        const experimentId = req.params.id;
        const results = await db.execute(sql `
      SELECT 
        ev.name as variant_name,
        COUNT(ep.id) as participants,
        COUNT(ep.converted_at) as conversions,
        ROUND((COUNT(ep.converted_at)::float / COUNT(ep.id)) * 100, 2) as conversion_rate
      FROM experiment_variants ev
      LEFT JOIN experiment_participants ep ON ev.id = ep.variant_id
      WHERE ev.experiment_id = ${experimentId}
      GROUP BY ev.id, ev.name
      ORDER BY ev.name
    `);
        res.json({ ok: true, results: results.rows });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
export default r;
