import { Router } from 'express';
import { authBearer } from '../middleware/authBearer.js';
import { requireRoles } from '../middleware/rbac.ts';

const r = Router();
r.use(authBearer);

// LIST (by contactId) - Office 365 façade
r.get('/', requireRoles('admin','user','marketing'), async (req, res) => {
  const { contactId } = req.query;
  if (!contactId) {
    return res.status(400).json({ ok: false, error: 'contactId required' });
  }
  // TODO: lookup threads by contact from Graph API
  return res.json({ ok: true, contactId, items: [] });
});

// SEND - Office 365 Graph façade with dryRun support
r.post('/', requireRoles('admin','user','marketing'), async (req, res) => {
  const { to, subject, html, templateId, contactId, dryRun, variables } = req.body || {};
  
  if (!Array.isArray(to) && typeof to !== 'string') {
    return res.status(400).json({ ok: false, error: 'to field required (string or array)' });
  }
  if (!subject || !html) {
    return res.status(400).json({ ok: false, error: 'subject and html required' });
  }
  
  // Dry run mode for testing
  if (dryRun) {
    return res.status(202).json({ 
      ok: true, 
      id: 'em_' + Date.now(), 
      dryRun: true, 
      to: Array.isArray(to) ? to : [to],
      contactId 
    });
  }
  
  // TODO: call Microsoft Graph sendMail with tenant credentials
  // await graphSendMail({ to, subject, html, templateId, variables });
  
  return res.status(202).json({ 
    ok: true, 
    id: 'em_' + Date.now(), 
    to: Array.isArray(to) ? to : [to],
    contactId,
    status: 'queued'
  });
});

export default r;