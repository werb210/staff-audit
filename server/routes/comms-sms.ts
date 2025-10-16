import { Router } from "express";
import { sendSmsSafe } from "../services/sms";

const router = Router();

// Send SMS with compliance checks
router.post("/", async (req: any, res: any) => {
  try {
    const { phone, body } = req.body;
    
    if (!phone || !body) {
      return res.status(400).json({ error: "Phone and body required" });
    }

    const result = await sendSmsSafe(phone, body);
    res.json({ ok: true, sid: result.sid });
  } catch (error: unknown) {
    const message = String(error);
    
    if (message.includes("opted_out")) {
      return res.status(400).json({ error: "Contact has opted out of SMS communications" });
    }
    
    if (message.includes("quiet_hours")) {
      return res.status(400).json({ error: "SMS not sent due to quiet hours (9PM-8AM local time)" });
    }
    
    console.error('[SMS SEND ERROR]', error);
    res.status(500).json({ error: message });
  }
});

// Check opt-out status
router.get("/opt-out/:phone", async (req: any, res: any) => {
  try {
    const { phone } = req.params;
    
    // Check opt-out status in database
    const { db } = await import("../db/drizzle");
    const { sql } = await import("drizzle-orm");
    
    const { rows } = await db.execute(sql`
      SELECT opted_out FROM sms_optouts WHERE phone=${phone} LIMIT 1
    `);
    
    res.json({ 
      phone, 
      opted_out: rows?.[0]?.opted_out || false 
    });
  } catch (error: unknown) {
    console.error('[OPT-OUT CHECK ERROR]', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;