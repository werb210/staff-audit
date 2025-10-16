import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
import { logContactActivity } from "../../services/activityLog";
import { publish } from "../../realtime/hub";

const router = Router();

router.post("/send", async (req: any, res: any) => {
  // Import rate limiting middleware
  const { emailLimiter, enforceCooldown } = await import("../../middleware/rateLimit");
  
  // Apply rate limiting
  await new Promise((resolve, reject) => {
    emailLimiter(req, res, (err) => {
      if (err) reject(err);
      else resolve(void 0);
    });
  });

  // body: { contactId, toEmail, subject, body, threadId? }
  const { contactId, toEmail, subject, body, threadId } = req.body || {};
  if (!contactId || !toEmail || !subject || !body) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // Check cooldown
  try {
    await enforceCooldown(`email:${contactId}`, Number(process.env.COOLDOWN_EMAIL_SECONDS || 60));
  } catch {
    return res.status(429).json({ error: "Email cooldown in effect" });
  }

  let tId = threadId;
  if (!tId) {
    const [t] = await q<{ id: string }>(`
      INSERT INTO comm_threads (contact_id, channel, subject) 
      VALUES ($1, 'email', $2) 
      RETURNING id
    `, [contactId, subject]);
    tId = t.id;
  }

  try {
    // Use Graph API to send email if user has O365 connected, otherwise store for manual processing
    let trackingId = null;
    try {
      const { sendUserEmail } = await import("../../services/graphEmail");
      const userId = (req as any).user?.id;
      if (userId) {
        const result = await sendUserEmail({ userId, toEmail, subject, htmlBody: body });
        trackingId = result.trackingId;
        console.log('✅ Email sent via Office 365 Graph API:', result.trackingId);
      }
    } catch (graphError) {
      console.log('📝 Graph API not available, storing email for manual processing:', graphError.message);
      // Continue with database storage as fallback
    }
    await q(`
      INSERT INTO comm_messages (thread_id, direction, channel, body, meta, created_by_user_id)
      VALUES ($1, 'out', 'email', $2, $3, $4)
    `, [tId, body, JSON.stringify({ toEmail, subject, trackingId }), (req as any).user?.id]);

    // Log activity and publish realtime update
    await logContactActivity({
      contactId,
      type: "email",
      direction: "out",
      title: subject,
      body,
      meta: { toEmail }
    });
    
    publish(`thread:${tId}`, { kind: "email", direction: "out", subject, body, toEmail });

    return res.json({ ok: true, threadId: tId });
  } catch (error: unknown) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

// Get email threads for a contact
router.get("/threads/:contactId", async (req: any, res: any) => {
  const { contactId } = req.params;
  
  try {
    const threads = await q<any>(`
      SELECT t.*, 
             COUNT(m.id) as message_count,
             MAX(m.created_at) as last_message_at
      FROM comm_threads t
      LEFT JOIN comm_messages m ON t.id = m.thread_id
      WHERE t.contact_id = $1 AND t.channel = 'email'
      GROUP BY t.id
      ORDER BY last_message_at DESC NULLS LAST
    `, [contactId]);

    return res.json({ threads });
  } catch (error: unknown) {
    console.error('Email threads fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch email threads' });
  }
});

export default router;