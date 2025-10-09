import { Router } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

router.get("/", async (_req, res) => {
  try {
    const r = await pool.query("SELECT id, name, email FROM contacts ORDER BY id ASC");
    res.json({ contacts: r.rows });
  } catch (err: any) {
    console.error("DB error:", err?.message);
    res.status(500).json({ error: "Database error", details: err?.message });
  }
});

export default router;
