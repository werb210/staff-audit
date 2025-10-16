// =======================================================
// Boreal Financial Staff Server — Contacts Route
// =======================================================

import express from "express";
import { Pool } from "pg";

const router = express.Router();

// ✅ PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// =======================================================
// GET /api/contacts
// =======================================================
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone FROM contacts ORDER BY name ASC"
    );
    res.json({
      ok: true,
      count: result.rows.length,
      items: result.rows,
    });
  } catch (err) {
    console.error("[Contacts] Error fetching:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch contacts" });
  }
});

// =======================================================
// POST /api/contacts/seed
// =======================================================
router.post("/seed", async (_req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT
      )
    `);

    await pool.query(`
      INSERT INTO contacts (name, email, phone)
      VALUES
        ('Lisa Morgan', 'lisa@boreal.financial', '+15878881837'),
        ('Todd Werboweski', 'todd@boreal.financial', '+18254511768'),
        ('Andrew Morris', 'andrew@boreal.financial', '+17753146801')
      ON CONFLICT DO NOTHING
    `);

    res.json({ ok: true, message: "Seeded sample contacts" });
  } catch (err) {
    console.error("[Contacts] Error seeding:", err);
    res.status(500).json({ ok: false, error: "Failed to seed contacts" });
  }
});

// =======================================================
// 404 Fallback for /api/contacts/*
// =======================================================
router.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Contact route not found" });
});

export default router;
