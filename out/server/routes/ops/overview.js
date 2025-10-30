import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
const router = Router();
router.get("/overview", async (_req, res) => {
    const out = { ready: null, counts: {}, queues: [], billing: null, health: null, release: null };
    // Ready probe (reuse /_ready impl via DB checks)
    try {
        const r = await db.execute(sql `
      SELECT
        (SELECT count(*)::int FROM contacts) AS contacts,
        (SELECT count(*)::int FROM applications) AS applications,
        (SELECT count(*)::int FROM documents) AS documents
    `);
        out.counts = r.rows?.[0] || {};
        out.ready = { ok: true };
    }
    catch (e) {
        out.ready = { ok: false, err: String(e?.message || e) };
        // Fallback counts if DB queries fail
        out.counts = { contacts: "—", applications: "—", documents: "—" };
    }
    // Queues (if configured)
    try {
        const { getKnownQueues, isQueuesOn, getCounts } = await import("../../services/queue/queues");
        if (isQueuesOn()) {
            const names = getKnownQueues();
            for (const n of names) {
                try {
                    out.queues.push({ name: n, counts: await getCounts(n) });
                }
                catch {
                    out.queues.push({ name: n, counts: null });
                }
            }
        }
    }
    catch {
        // Queue system not available
    }
    // Health summary (if available)
    try {
        const { getHealthSummary } = await import("../../middleware/healthCanary");
        out.health = getHealthSummary();
    }
    catch {
        // Health middleware not available
        out.health = { m15: { req: 0, errRate: 0, p95: null }, m60: { req: 0, errRate: 0, p95: null } };
    }
    // Billing usage (if present)
    try {
        const { summary: billingSummary } = await import("../../services/billing/core");
        out.billing = await billingSummary();
    }
    catch {
        // Billing not available
    }
    // Latest live release
    try {
        const lr = await db.execute(sql `SELECT version, codename, live_at FROM releases WHERE status='live' ORDER BY live_at DESC LIMIT 1`);
        out.release = lr.rows?.[0] || null;
    }
    catch {
        // Releases table not available
    }
    res.json(out);
});
export default router;
