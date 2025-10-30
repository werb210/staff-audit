import { Router } from "express";
const router = Router();
router.get("/tasks", async (req, res) => {
    try {
        const tasks = await (req.app.locals.db.tasks?.list?.() ?? []);
        // Generate CSV content
        const headers = ["ID", "Title", "Description", "Status", "Created"];
        const rows = tasks.map((t) => [
            t.id || "",
            (t.title || "").replace(/"/g, '""'),
            (t.description || "").replace(/"/g, '""'),
            t.status || "",
            t.createdAt || new Date().toISOString()
        ]);
        const csvContent = [
            headers.join(","),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
        ].join("\n");
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.csv"');
        res.send(csvContent);
    }
    catch (err) {
        console.error("[EXPORTS] tasks error:", err);
        res.status(500).json({ error: "export_failed" });
    }
});
router.get("/analytics", async (req, res) => {
    try {
        const comms = await (req.app.locals.db.communications?.getAll?.() ?? []);
        // Generate CSV content for communications analytics
        const headers = ["Type", "Direction", "Contact ID", "At", "Text"];
        const rows = comms.map((c) => [
            c.type || "",
            c.direction || "",
            c.contactId || "",
            c.at || "",
            (c.text || "").slice(0, 100).replace(/"/g, '""')
        ]);
        const csvContent = [
            headers.join(","),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
        ].join("\n");
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
        res.send(csvContent);
    }
    catch (err) {
        console.error("[EXPORTS] analytics error:", err);
        res.status(500).json({ error: "export_failed" });
    }
});
export default router;
