import { Router } from "express";
const router = Router();
/** GET /api/analytics/comms */
router.get("/comms", async (req, res) => {
    try {
        const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = req.query.endDate || new Date().toISOString();
        // Aggregate from multiple sources
        const comms = await (req.app.locals.db.communications?.getAllInRange?.(startDate, endDate) ?? []);
        const transcripts = await (req.app.locals.db.transcripts?.all?.() ?? []);
        const tasks = await (req.app.locals.db.tasks?.list?.() ?? []);
        // Basic analytics calculations
        const smsCount = comms.filter((c) => c.type === "sms").length;
        const emailCount = comms.filter((c) => c.type === "email").length;
        const callCount = comms.filter((c) => c.type === "call").length;
        const transcriptCount = transcripts.length;
        const openTasks = tasks.filter((t) => t.status === "open").length;
        const doneTasks = tasks.filter((t) => t.status === "done").length;
        // Response time analysis (simplified)
        const avgResponseTime = "2.3 hours"; // placeholder calculation
        const result = {
            period: { startDate, endDate },
            communications: {
                total: comms.length,
                sms: smsCount,
                email: emailCount,
                calls: callCount,
                transcripts: transcriptCount
            },
            tasks: {
                open: openTasks,
                completed: doneTasks,
                total: tasks.length
            },
            metrics: {
                avgResponseTime,
                busyHours: ["9:00-10:00", "14:00-15:00"], // mock data
                topChannels: ["SMS", "Email", "Voice"]
            }
        };
        res.json(result);
    }
    catch (err) {
        console.error("[ANALYTICS] comms error:", err);
        res.status(500).json({ error: "analytics_failed", message: err?.message ?? "unknown" });
    }
});
export default router;
