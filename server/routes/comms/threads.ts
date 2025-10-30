import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";

const router = Router();

// Get all threads with SLA status
router.get("/", async (req: any, res: any) => {
  try {
    const threads = await q<any>(`
      SELECT 
        t.id,
        t.contact_id,
        t.channel,
        t.last_inbound_at,
        t.last_outbound_at,
        t.unread_count,
        t.assigned_to_user_id,
        t.status,
        t.snooze_until,
        t.muted,
        t.sla_due_at,
        t.sla_status,
        c.first_name,
        c.last_name,
        c.email,
        c.phone
      FROM comm_threads t
      LEFT JOIN contacts c ON c.id = t.contact_id
      ORDER BY t.last_inbound_at DESC NULLS LAST, t.createdAt DESC
      LIMIT 100
    `);
    
    res.json(threads);
  } catch (error: unknown) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// Snooze thread
router.post("/:threadId/snooze", async (req: any, res: any) => {
  const { threadId } = req.params;
  const minutes = Number(req.body?.minutes || 15);
  await q(`UPDATE comm_threads SET snooze_until = $1 WHERE id = $2`, [new Date(Date.now() + minutes*60*1000), threadId]);
  res.json({ ok: true });
});

// Mute/unmute thread
router.post("/:threadId/mute", async (req: any, res: any) => {
  const { threadId } = req.params;
  await q(`UPDATE comm_threads SET muted = NOT COALESCE(muted,false) WHERE id = $1`, [threadId]);
  res.json({ ok: true });
});

export default router;