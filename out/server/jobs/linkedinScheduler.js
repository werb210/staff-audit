import { registerJob } from "../services/scheduler";
import { runSequence } from "../services/sequenceService";
import { pool } from "../db";
/**
 * Cron job to auto-run LinkedIn Sequences
 * Every 5 minutes by default
 */
export function initLinkedInScheduler() {
    const schedule = process.env.SEQUENCE_CRON || "*/5 * * * *";
    registerJob("LinkedIn Sequences", schedule, async () => {
        console.log("[LinkedInScheduler] Running all active sequences...");
        try {
            const result = await pool.query("SELECT id FROM sequences WHERE active = true");
            const sequences = result.rows;
            for (const seq of sequences) {
                try {
                    await runSequence(seq.id);
                    console.log(`[LinkedInScheduler] Ran sequence ${seq.id}`);
                }
                catch (err) {
                    console.error(`[LinkedInScheduler] Error running seq ${seq.id}`, err);
                }
            }
        }
        catch (err) {
            console.error("[LinkedInScheduler] DB fetch failed", err);
        }
    });
    console.log(`✅ [LinkedInScheduler] Initialized with schedule: ${schedule}`);
}
