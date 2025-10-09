import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email FROM contacts LIMIT 10;"
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

export default router;
