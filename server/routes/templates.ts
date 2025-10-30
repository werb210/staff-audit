import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly.js";

const r = Router();
r.use(requireAuth);

// Get all templates
r.get("/templates", async (req: any, res: any) => {
  try {
    const { rows } = await db.execute(sql`
      SELECT * FROM comm_templates 
      ORDER BY createdAt DESC
    `);
    res.json({ ok: true, items: rows });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to fetch templates" });
  }
});

// Create new template
r.post("/templates", async (req: any, res) => {
  try {
    const { kind, name, subject, body } = req.body || {};
    if (!kind || !name || !body) {
      return res.status(400).json({ ok: false, error: "kind, name, and body required" });
    }
    
    const { rows } = await db.execute(sql`
      INSERT INTO comm_templates(kind, name, subject, body, created_by) 
      VALUES(${kind}, ${name}, ${subject || null}, ${body}, ${req.user?.sub || null}) 
      RETURNING *
    `);
    
    res.json({ ok: true, item: rows[0] });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to create template" });
  }
});

// Update template
r.put("/templates/:id", async (req: any, res) => {
  try {
    const { kind, name, subject, body } = req.body || {};
    const { rows } = await db.execute(sql`
      UPDATE comm_templates 
      SET kind=${kind}, name=${name}, subject=${subject}, body=${body}
      WHERE id=${req.params.id}
      RETURNING *
    `);
    
    res.json({ ok: true, item: rows[0] });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to update template" });
  }
});

// Delete template
r.delete("/templates/:id", async (req: any, res: any) => {
  try {
    await db.execute(sql`DELETE FROM comm_templates WHERE id=${req.params.id}`);
    res.json({ ok: true });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to delete template" });
  }
});

// Preview template with variable substitution
r.post("/templates/preview", async (req: any, res: any) => {
  try {
    const { body, variables = {} } = req.body || {};
    
    let preview = body || "";
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      preview = preview.replace(new RegExp(placeholder, 'g'), String(value));
    });
    
    res.json({ ok: true, preview });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Preview failed" });
  }
});

export default r;