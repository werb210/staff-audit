import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
import { onInboundMessage, onOutboundMessage } from "../../services/sla";

const router = Router();

// Get SLA policies
router.get("/policies", async (_req, res) => {
  try {
    const policies = await q<any>(`
      SELECT * FROM sla_policies WHERE active=true ORDER BY target_minutes ASC
    `);
    res.json(policies);
  } catch (error: unknown) {
    console.error('SLA policies error:', error);
    res.status(500).json({ error: 'Failed to fetch SLA policies' });
  }
});

// Get thread SLAs with status
router.get("/threads/:threadId", async (req: any, res: any) => {
  try {
    const { threadId } = req.params;
    const slas = await q<any>(`
      SELECT ts.*, sp.name as policy_name, sp.target_minutes
      FROM thread_slas ts
      JOIN sla_policies sp ON sp.id = ts.policy_id
      WHERE ts.thread_id = $1
      ORDER BY ts.due_at ASC
    `, [threadId]);
    
    res.json(slas);
  } catch (error: unknown) {
    console.error('Thread SLAs error:', error);
    res.status(500).json({ error: 'Failed to fetch thread SLAs' });
  }
});

// Update thread SLA manually (snooze/mute)
router.patch("/threads/:threadId", async (req: any, res: any) => {
  try {
    const { threadId } = req.params;
    const { snooze_until, muted } = req.body;
    
    await q(`
      UPDATE comm_threads 
      SET snooze_until = $1, muted = COALESCE($2, muted)
      WHERE id = $3
    `, [snooze_until, muted, threadId]);
    
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Thread SLA update error:', error);
    res.status(500).json({ error: 'Failed to update thread SLA' });
  }
});

// Trigger SLA hooks manually (for testing)
router.post("/hooks/inbound/:threadId", async (req: any, res: any) => {
  try {
    const { threadId } = req.params;
    await onInboundMessage(threadId);
    res.json({ success: true, message: "Inbound SLA hook triggered" });
  } catch (error: unknown) {
    console.error('Inbound SLA hook error:', error);
    res.status(500).json({ error: 'Failed to trigger inbound SLA hook' });
  }
});

router.post("/hooks/outbound/:threadId", async (req: any, res: any) => {
  try {
    const { threadId } = req.params;
    await onOutboundMessage(threadId);
    res.json({ success: true, message: "Outbound SLA hook triggered" });
  } catch (error: unknown) {
    console.error('Outbound SLA hook error:', error);
    res.status(500).json({ error: 'Failed to trigger outbound SLA hook' });
  }
});

export default router;