import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";

const r = Router();
r.use(requireAuth);

// List call records
r.get("/calls", async (req: any, res: any) => {
  try {
    const result = await db.execute(sql`
      SELECT cr.*, c.full_name, c.email, c.phone
      FROM call_records cr
      LEFT JOIN contacts c ON cr.contact_id = c.id
      ORDER BY cr.created_at DESC
      LIMIT 50
    `);
    
    const calls = (result.rows || result).map((call: any) => ({
      id: call.id,
      sid: call.sid,
      status: call.status,
      recording_url: call.recording_url,
      duration_seconds: call.duration_seconds,
      created_at: call.created_at,
      contact: call.full_name ? {
        id: call.contact_id,
        name: call.full_name,
        email: call.email,
        phone: call.phone
      } : null
    }));
    
    res.json({ ok: true, items: calls });
  } catch (error: unknown) {
    console.error("[COMMS CALLS] List error:", error);
    res.status(500).json({ ok: false, error: "Failed to list calls" });
  }
});

// Get call details
r.get("/calls/:id", async (req: any, res: any) => {
  try {
    const result = await db.execute(sql`
      SELECT cr.*, c.full_name, c.email, c.phone
      FROM call_records cr
      LEFT JOIN contacts c ON cr.contact_id = c.id
      WHERE cr.id = ${req.params.id}
    `);
    
    const call = (result.rows || result)[0];
    if (!call) {
      return res.status(404).json({ ok: false, error: "Call not found" });
    }
    
    res.json({ ok: true, item: call });
  } catch (error: unknown) {
    console.error("[COMMS CALLS] Get error:", error);
    res.status(500).json({ ok: false, error: "Failed to get call" });
  }
});

export default r;