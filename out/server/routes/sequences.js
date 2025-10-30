import { Router } from "express";
import { createSequence, addStep, importProspects, runSequence } from "../services/sequenceService";
import { pool } from "../db";
const router = Router();
// List all sequences
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM sequences ORDER BY createdAt DESC");
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create sequence
router.post("/", async (req, res) => {
    try {
        const { name, owner_id } = req.body;
        const seq = await createSequence(name, owner_id);
        res.json(seq);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Add step
router.post("/:id/steps", async (req, res) => {
    try {
        const { type, content, delay_hours, step_order } = req.body;
        const step = await addStep(req.params.id, type, content, delay_hours, step_order);
        res.json(step);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Import prospects (stub parser)
router.post("/:id/prospects/import", async (req, res) => {
    try {
        const { searchUrl } = req.body;
        // Stub: parse LinkedIn search URL into fake prospects
        const prospects = [
            { name: "John Doe", title: "Operations Manager", profile_url: "https://linkedin.com/in/johndoe" },
            { name: "Jane Smith", title: "CFO", profile_url: "https://linkedin.com/in/janesmith" },
        ];
        const inserted = await importProspects(req.params.id, prospects);
        res.json(inserted);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Run sequence (stub)
router.post("/:id/run", async (req, res) => {
    try {
        await runSequence(req.params.id);
        res.json({ ok: true, message: "Sequence scheduler started" });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Logs
router.get("/:id/logs", async (req, res) => {
    try {
        const logs = await pool.query("SELECT * FROM sequence_logs WHERE sequence_id=$1", [req.params.id]);
        res.json(logs.rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Report
router.get("/:id/report", async (req, res) => {
    try {
        const report = await pool.query(`SELECT status, COUNT(*) FROM prospects WHERE sequence_id=$1 GROUP BY status`, [req.params.id]);
        res.json(report.rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
