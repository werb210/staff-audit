import { Router } from "express";
import bcrypt from "bcryptjs";

const router = Router();

// Bypass auth for admin seeding - mount before auth middleware

router.post("/seed-admin", async (req: any, res) => {
  try {
    const email = String(req.body?.email || "admin@example.com").toLowerCase().trim();
    const pw = String(req.body?.password || "ChangeMe!2025");
    
    // Use direct PostgreSQL connection
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Check if admin already exists
    const existing = await pool.query("SELECT id FROM staff_users WHERE lower(email) = lower($1) LIMIT 1", [email]);
    if (existing.rows?.length) {
      pool.end();
      return res.json({ ok: true, existed: true, email });
    }
    
    // Create admin user
    const hash = await bcrypt.hash(pw, 12);
    const result = await pool.query(
      "INSERT INTO staff_users(email, role, password_hash, createdAt) VALUES ($1, 'admin', $2, NOW()) RETURNING id",
      [email, hash]
    );
    
    pool.end();
    res.json({ ok: true, id: result.rows?.[0]?.id, email, created: true });
  } catch (error: unknown) {
    console.error("Seed admin error:", error);
    res.status(500).json({ error: "Failed to seed admin: " + (error as Error).message });
  }
});

export default router;