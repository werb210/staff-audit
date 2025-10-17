import { Router } from "express";
import { db } from "../db"; // named export, not default
import { sql } from "drizzle-orm";

const router = Router();

router.get("/cards", async (_req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM pipeline ORDER BY created_at DESC`);
    res.json(result.rows ?? result);
  } catch (err) {
    console.error("Pipeline query failed:", err);
    res.status(500).json({ error: "query failed" });
  }
});

router.get("/cards/:id/application", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM applications WHERE id = ${req.params.id}`);
    res.json({ id: req.params.id, app: result.rows?.[0] || null, ok: true });
  } catch (err) {
    console.error("App query failed:", err);
    res.status(500).json({ error: "query failed" });
  }
});

router.get("/cards/:id/documents", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM documents WHERE application_id = ${req.params.id}`);
    res.json({ id: req.params.id, documents: result.rows ?? result, ok: true });
  } catch (err) {
    console.error("Docs query failed:", err);
    res.status(500).json({ error: "query failed" });
  }
});

export default router;
