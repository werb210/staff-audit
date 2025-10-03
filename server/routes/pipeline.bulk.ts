import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly.js";

const r = Router();
r.use(requireAuth);

// Bulk update applications
r.patch("/pipeline/bulk", async (req: any, res) => {
  try {
    const { ids = [], action, to } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ ok: false, error: "ids_required" });
    }
    
    if (action === "stage") {
      await db.execute(sql`UPDATE applications SET stage=${to} WHERE id = ANY(${ids})`);
    } else if (action === "owner") {
      const owner = to === "me" ? req.user?.sub : null;
      await db.execute(sql`UPDATE applications SET owner_id=${owner} WHERE id = ANY(${ids})`);
    }
    
    res.json({ ok: true });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Bulk update failed" });
  }
});

// Bulk SMS to applications
r.post("/pipeline/bulk/sms", async (req: any, res) => {
  try {
    const { ids = [], body } = req.body || {};
    if (!body) return res.status(400).json({ ok: false, error: "body_required" });
    
    const { rows } = await db.execute(sql`
      SELECT a.id, c.phone 
      FROM applications a 
      JOIN contacts c ON c.id = a.contact_id 
      WHERE a.id = ANY(${ids})
    `);
    
    let sent = 0;
    for (const r of rows) {
      if (r.phone) {
        try {
          // Use existing SMS service
          await fetch(`${process.env.INTERNAL_BASE_URL || "http://localhost:5000"}/api/sms/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              to: r.phone, 
              body, 
              contactId: null, 
              appId: r.id 
            })
          });
          sent++;
        } catch (error: unknown) {
          console.error(`Failed to send SMS to ${r.phone}:`, error);
        }
      }
    }
    
    res.json({ ok: true, sent });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Bulk SMS failed" });
  }
});

export default r;