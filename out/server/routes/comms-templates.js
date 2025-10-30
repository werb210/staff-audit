import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";
const r = Router();
r.use(requireAuth);
// List templates
r.get("/", async (_req, res) => {
    try {
        const items = await db.execute(sql `SELECT * FROM message_templates ORDER BY name`);
        res.json({ ok: true, items: items.rows || items });
    }
    catch (error) {
        console.error("[TEMPLATES] List error:", error);
        res.status(500).json({ ok: false, error: "Failed to list templates" });
    }
});
// Create template
r.post("/", async (req, res) => {
    const { channel, name, body, variables } = req.body || {};
    try {
        const result = await db.execute(sql `
      INSERT INTO message_templates (channel, name, body, variables)
      VALUES (${channel}, ${name}, ${body}, ${variables || null})
      RETURNING *
    `);
        const row = (result.rows || result)[0];
        res.json({ ok: true, item: row });
    }
    catch (error) {
        console.error("[TEMPLATES] Create error:", error);
        res.status(500).json({ ok: false, error: "Failed to create template" });
    }
});
// Update template
r.put("/:id", async (req, res) => {
    const { channel, name, body, variables } = req.body || {};
    const id = req.params.id;
    try {
        const result = await db.execute(sql `
      UPDATE message_templates 
      SET channel = ${channel}, name = ${name}, body = ${body}, variables = ${variables || null}
      WHERE id = ${id}
      RETURNING *
    `);
        const row = (result.rows || result)[0];
        res.json({ ok: true, item: row });
    }
    catch (error) {
        console.error("[TEMPLATES] Update error:", error);
        res.status(500).json({ ok: false, error: "Failed to update template" });
    }
});
// Delete template
r.delete("/:id", async (req, res) => {
    const id = req.params.id;
    try {
        await db.execute(sql `DELETE FROM message_templates WHERE id = ${id}`);
        res.json({ ok: true });
    }
    catch (error) {
        console.error("[TEMPLATES] Delete error:", error);
        res.status(500).json({ ok: false, error: "Failed to delete template" });
    }
});
export default r;
