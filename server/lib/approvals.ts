import { db } from '../db/drizzle';
import { approvalRequests } from '../../shared/schema';
import crypto from 'crypto';
// import { logActivity } from './activities';

interface QueueApprovalInput {
  tenant: 'bf' | 'slf';
  contactId?: string;
  applicationId?: string;
  channel: 'sms' | 'email' | 'linkedin' | 'task' | 'other';
  action: 'send_message' | 'create_task' | 'other';
  toAddress?: string;
  preview: string;
  body: string;
  meta?: any;
  createdBy?: string;
}

export function shortCode(): string {
  return crypto.randomBytes(3).toString('hex').slice(0, 4).toUpperCase();
}

export async function queueApproval(input: QueueApprovalInput) {
  const code = shortCode();
  
  const [ar] = await db.insert(approvalRequests).values({
    tenant: input.tenant,
    status: 'queued',
    channel: input.channel,
    action: input.action,
    contactId: input.contactId || null,
    applicationId: input.applicationId || null,
    toAddress: input.toAddress || null,
    approverPhone: process.env.APPROVER_MSISDN || '',
    code,
    preview: input.preview.slice(0, 240),
    body: input.body,
    meta: input.meta || {},
    createdBy: input.createdBy || null
  }).returning();

  // Send SMS to approver
  const lines = [
    `Approve ${input.action} (${input.channel})?`,
    input.preview,
    input.body ? `---\n${input.body}` : '',
    `Reply: YES ${code}  or  NO ${code}`
  ].filter(Boolean);

  // Import sendSMS dynamically to avoid circular dependency
  try {
    const { sendSMS } = await import('./sms');
    await sendSMS(ar.approverPhone, lines.join('\n'));
  } catch (error) {
    console.error('Failed to send approval SMS:', error);
  }

  return ar;
}

// Helper to dispatch approved actions
export async function dispatchApproved(ar: any) {
  if (ar.action === 'create_task') {
    // Create internal task (no client outreach)
    const { tasks } = await import('../../shared/schema');
    
    const [task] = await db.insert(tasks).values({
      tenant: ar.tenant,
      title: ar.preview || 'Task',
      status: 'open',
      contactId: ar.contactId,
      applicationId: ar.applicationId,
      tags: ['approval', 'manual'],
      description: ar.body || ''
    }).returning();
    
    return task;
  }
  
  if (ar.action === 'send_message') {
    // Handle different message channels
    if (ar.channel === 'sms' && ar.toAddress) {
      const { sendSMS } = await import('./sms');
      await sendSMS(ar.toAddress, ar.body || '');
      return { ok: true, sent: 'sms' };
    }
    
    if (ar.channel === 'email' && ar.toAddress) {
      // TODO: Implement email sending
      return { ok: true, sent: 'email' };
    }
    
    if (ar.channel === 'linkedin') {
      // TODO: Implement LinkedIn messaging
      return { ok: true, sent: 'linkedin' };
    }
  }
  
  return { ok: true };
}