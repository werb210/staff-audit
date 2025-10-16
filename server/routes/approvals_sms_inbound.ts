import { Router } from 'express';
import twilio from 'twilio';
import { db } from '../db/drizzle';
import { approvalRequests } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
// import { logActivity } from '../lib/activities';
import { dispatchApproved } from '../lib/approvals';

const router = Router();

// Validate Twilio signature (optional in dev)
function validateTwilio(req: any): boolean {
  const sig = req.headers['x-twilio-signature'];
  if (!sig) return true; // Loosen for local development
  
  const url = (process.env.PUBLIC_URL || '') + req.originalUrl;
  const params = req.body;
  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN || '', 
    sig as string, 
    url, 
    params
  );
  return valid;
}

// Handle inbound SMS for YES/NO approval responses
router.post('/approvals/sms-inbound', async (req: any, res: any) => {
  try {
    if (!validateTwilio(req)) {
      return res.status(403).send('forbidden');
    }

    const From = String(req.body.From || '');
    const Body = String(req.body.Body || '').trim().toLowerCase();

    // Only accept replies from approver phone
    const approver = (process.env.APPROVER_MSISDN || '').replace(/\s+/g, '');
    if (From.replace(/\s+/g, '') !== approver) {
      return res.send('<Response></Response>');
    }

    // Parse YES/NO with optional code
    const match = Body.match(/^(yes|no)(?:\s+([A-Z0-9]{2,6}))?/i);
    if (!match) {
      return res.send('<Response></Response>');
    }

    const intent = match[1];
    const code = (match[2] || '').toUpperCase();

    // Find approval request by code or latest queued
    let ar;
    if (code) {
      [ar] = await db.select()
        .from(approvalRequests)
        .where(and(
          eq(approvalRequests.code, code),
          eq(approvalRequests.status, 'queued'),
          eq(approvalRequests.approverPhone, approver)
        ))
        .orderBy(approvalRequests.createdAt)
        .limit(1);
    } else {
      [ar] = await db.select()
        .from(approvalRequests)
        .where(and(
          eq(approvalRequests.status, 'queued'),
          eq(approvalRequests.approverPhone, approver)
        ))
        .orderBy(approvalRequests.createdAt)
        .limit(1);
    }

    if (!ar) {
      return res.send('<Response></Response>');
    }

    if (intent === 'yes') {
      // Approve and execute
      await db.update(approvalRequests)
        .set({ status: 'approved' })
        .where(eq(approvalRequests.id, ar.id));

      await logActivity({
        tenant: ar.tenant,
        type: 'approval_approved',
        contactId: ar.contactId || undefined,
        applicationId: ar.applicationId || undefined,
        tags: ['approval', 'approved', ar.channel, ar.action],
        meta: { approvalId: ar.id, code: ar.code }
      });

      // Dispatch the approved action
      try {
        const result = await dispatchApproved(ar);
        
        await db.update(approvalRequests)
          .set({ status: 'sent' })
          .where(eq(approvalRequests.id, ar.id));
        
        await logActivity({
          tenant: ar.tenant,
          type: 'action_sent',
          contactId: ar.contactId || undefined,
          applicationId: ar.applicationId || undefined,
          tags: [ar.channel, ar.action],
          meta: { approvalId: ar.id, result }
        });
      } catch (error: any) {
        await db.update(approvalRequests)
          .set({ status: 'error' })
          .where(eq(approvalRequests.id, ar.id));
        
        await logActivity({
          tenant: ar.tenant,
          type: 'action_error',
          contactId: ar.contactId || undefined,
          applicationId: ar.applicationId || undefined,
          tags: [ar.channel, ar.action],
          meta: { approvalId: ar.id, error: String(error?.message || error) }
        });
      }
    } else {
      // NO → hold the request
      await db.update(approvalRequests)
        .set({ status: 'held' })
        .where(eq(approvalRequests.id, ar.id));

      await logActivity({
        tenant: ar.tenant,
        type: 'approval_rejected',
        contactId: ar.contactId || undefined,
        applicationId: ar.applicationId || undefined,
        tags: ['approval', 'held', ar.channel, ar.action],
        meta: { approvalId: ar.id, code: ar.code }
      });
    }

    res.type('text/xml').send('<Response></Response>');
  } catch (error: unknown) {
    console.error('SMS approval processing error:', error);
    res.type('text/xml').send('<Response></Response>');
  }
});

export default router;