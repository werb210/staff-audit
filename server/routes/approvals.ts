import { Router } from 'express';
import twilio from 'twilio';
import { db } from '../db/drizzle';
import { approvalRequests } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { queueApproval, dispatchApproved } from '../lib/approvals';
import { TenantRequest } from '../middleware/tenant';

const router = Router();

// Temporary activity logging stub
async function logActivity(data: any) {
  console.log('[ACTIVITY]', JSON.stringify(data, null, 2));
}

// Create an approval request
router.post('/request', async (req: TenantRequest, res) => {
  try {
    const tenant = req.tenant || 'bf';
    const { contactId, applicationId, channel, action, toAddress, preview, body, meta } = req.body || {};
    
    if (!channel || !action || !preview) {
      return res.status(400).json({ 
        ok: false, 
        error: 'missing_fields',
        message: 'channel, action, and preview are required'
      });
    }

    const ar = await queueApproval({ 
      tenant, 
      contactId, 
      applicationId, 
      channel, 
      action, 
      toAddress, 
      preview, 
      body, 
      meta, 
      createdBy: req.user?.id 
    });

    await logActivity({
      tenant, 
      type: 'approval_requested',
      contactId: contactId || undefined, 
      applicationId: applicationId || undefined,
      tags: ['approval', 'queued', channel, action],
      meta: { 
        approvalId: ar.id, 
        code: ar.code, 
        preview, 
        toAddress 
      }
    });

    res.json({ 
      ok: true, 
      approvalId: ar.id, 
      code: ar.code, 
      status: ar.status 
    });
  } catch (error: unknown) {
    console.error('Approval request error:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'internal_error',
      message: 'Failed to create approval request'
    });
  }
});

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
router.post('/sms-inbound', async (req: any, res: any) => {
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

// List approval requests with filtering
router.get('/', async (req: TenantRequest, res) => {
  try {
    const tenant = req.tenant || 'bf';
    const { contactId, status } = req.query as any;
    
    let conditions = [eq(approvalRequests.tenant, tenant)];
    
    if (contactId) {
      conditions.push(eq(approvalRequests.contactId, String(contactId)));
    }
    
    if (status) {
      conditions.push(eq(approvalRequests.status, String(status)));
    }
    
    const items = await db.select()
      .from(approvalRequests)
      .where(and(...conditions))
      .orderBy(desc(approvalRequests.updatedAt));
      
    res.json({ ok: true, items });
  } catch (error: unknown) {
    console.error('Failed to fetch approval requests:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'internal_error',
      message: 'Failed to fetch approval requests'
    });
  }
});

// Get single approval request by ID
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const tenant = req.tenant || 'bf';
    const { id } = req.params;
    
    const [item] = await db.select()
      .from(approvalRequests)
      .where(and(
        eq(approvalRequests.id, id),
        eq(approvalRequests.tenant, tenant)
      ))
      .limit(1);
      
    if (!item) {
      return res.status(404).json({ 
        ok: false, 
        error: 'not_found',
        message: 'Approval request not found'
      });
    }
    
    res.json({ ok: true, item });
  } catch (error: unknown) {
    console.error('Failed to fetch approval request:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'internal_error',
      message: 'Failed to fetch approval request'
    });
  }
});

export default router;