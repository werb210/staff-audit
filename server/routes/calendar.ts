import { Router } from "express";
import { pool } from "../db";

const r = Router();

r.get("/events", async (req: any, res: any) => {
  const { start, end, silo } = req.query as { start: string; end: string; silo?: string };
  if (!start || !end) {
    return res.status(400).json({ ok: false, error: "Missing start/end" });
  }

  try {
    // Example: events table; adapt names as needed.
    // CREATE INDEX IF NOT EXISTS idx_events_time ON events(start_at, end_at);
    const sql = `
      SELECT id, title, start_at AS start, end_at AS end, all_day AS "allDay", location, description
      FROM events
      WHERE start_at < $2 AND end_at > $1
        AND ($3::text IS NULL OR silo = $3)
      ORDER BY start_at ASC`;
    
    const { rows } = await pool.query(sql, [start, end, silo ?? null]);
    res.json(rows);
  } catch (error: unknown) {
    console.error("Calendar events error:", error);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default r;