import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";

const router = Router();

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  }),
  userAgent: z.string().optional(),
  userId: z.string().optional(),
});

router.post("/subscribe", async (req: any, res: any) => {
  try {
    const body = subSchema.parse(req.body);
    const userId = req.user?.id || body.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    await db.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (endpoint) DO NOTHING
    `, [userId, body.endpoint, body.keys.p256dh, body.keys.auth, body.userAgent || null]);

    console.log(`✅ [PUSH-SUBSCRIBE] User ${userId} subscribed endpoint: ${body.endpoint.substring(0, 50)}...`);
    res.json({ success: true });
  } catch (e: any) {
    console.error(`❌ [PUSH-SUBSCRIBE] Error:`, e);
    res.status(400).json({ error: e.message });
  }
});

router.post("/unsubscribe", async (req: any, res: any) => {
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint required" });
    }
    
    await db.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [endpoint]);
    console.log(`✅ [PUSH-UNSUBSCRIBE] Removed endpoint: ${endpoint.substring(0, 50)}...`);
    res.json({ success: true });
  } catch (e: any) {
    console.error(`❌ [PUSH-UNSUBSCRIBE] Error:`, e);
    res.status(500).json({ error: e.message });
  }
});

router.get("/subscriptions", async (req: any, res: any) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const { rows } = await db.query(`
      SELECT id, endpoint, user_agent, createdAt 
      FROM push_subscriptions 
      WHERE user_id = $1 
      ORDER BY createdAt DESC
    `, [req.user.id]);

    res.json({ subscriptions: rows });
  } catch (e: any) {
    console.error(`❌ [PUSH-SUBSCRIPTIONS] Error:`, e);
    res.status(500).json({ error: e.message });
  }
});

export default router;