import { Router } from "express";
import { Pool } from "pg";

const router = Router();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

// Ensure the "contacts" table exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      );
    `);
    console.log("✅ Contacts table ready");
  } catch (err) {
    console.error("❌ Failed to ensure contacts table:", (err as Error).message);
  }
})();

// GET /api/contacts → return all contacts
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email FROM contacts ORDER BY id ASC");
    res.json({ contacts: result.rows });
  } catch (err: any) {
    console.error("DB error:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// POST /api/contacts/seed → (optional) seed initial data manually
router.post("/seed", async (_req, res) => {
  try {
    await pool.query(`
      INSERT INTO contacts (name, email)
      VALUES
        ('Todd Werboweski', 'todd.w@boreal.financial'),
        ('Andrew Smith', 'andrew@boreal.financial'),
        ('Lisa Morgan', 'lisa@boreal.financial')
      ON CONFLICT DO NOTHING;
    `);
    res.json({ message: "✅ Contacts seeded successfully" });
  } catch (err: any) {
    console.error("Seed error:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

export default router;
