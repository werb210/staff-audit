import { Router } from 'express';
import { authBearer } from '../middleware/authBearer.js';
import { requireRoles } from '../middleware/rbac.ts';

const r = Router();
r.use(authBearer);

// SEND - Twilio SMS façade with template support
r.post('/', requireRoles('admin','user','marketing'), async (req, res) => {
  const { to, body, templateId, variables, contactId, dryRun } = req.body || {};
  
  if (!to || (!body && !templateId)) {
    return res.status(400).json({ ok: false, error: 'to and (body or templateId) required' });
  }
  
  // Dry run mode for testing
  if (dryRun) {
    return res.status(202).json({ 
      ok: true, 
      id: 'sm_' + Date.now(), 
      dryRun: true, 
      to, 
      contactId 
    });
  }
  
  // TODO: resolve template if templateId provided, call Twilio Messages API
  // if (templateId) { body = await resolveTemplate(templateId, variables); }
  // const result = await twilioClient.messages.create({ to, body, from: TWILIO_PHONE });
  
  return res.status(202).json({ 
    ok: true, 
    id: 'sm_' + Date.now(), 
    to, 
    contactId,
    status: 'queued'
  });
});

// LIST - SMS thread by contact
r.get('/', requireRoles('admin','user','marketing'), async (req, res) => {
  const { contactId } = req.query;
  if (!contactId) {
    return res.status(400).json({ ok: false, error: 'contactId required' });
  }
  
  // TODO: read SMS history from database by contactId
  return res.json({ 
    ok: true, 
    contactId, 
    items: [] // SMS messages with status, timestamp, direction
  });
});

// Webhook endpoint for delivery status (same path, detects Twilio payload)
r.post('/webhook', async (req, res) => {
  const { MessageSid, MessageStatus, To, From } = req.body || {};
  
  if (MessageSid) {
    // TODO: update message status in database
    console.log(`SMS ${MessageSid} status: ${MessageStatus}`);
    return res.status(200).send('OK');
  }
  
  return res.status(400).json({ ok: false, error: 'Invalid webhook payload' });
});

export default r;