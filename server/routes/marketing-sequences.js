import { Router } from 'express';
import { authBearer } from '../middleware/authBearer.js';
import { requireRole } from '../middleware/rbac.js';

const r = Router();
r.use(authBearer);

// In-memory store for sequences (replace with database)
let sequences = [
  {
    id: 'sq_demo_1',
    name: 'LinkedIn Outreach - SaaS CEOs',
    status: 'active',
    steps: [
      { id: 'step_1', type: 'linkedinConnect', name: 'Connect Request', templateId: 'tpl_connect_1' },
      { id: 'step_2', type: 'wait', name: 'Wait 2 days', waitHours: 48 },
      { id: 'step_3', type: 'linkedinMessage', name: 'Follow-up Message', templateId: 'tpl_followup_1' },
      { id: 'step_4', type: 'wait', name: 'Wait 3 days', waitHours: 72 },
      { id: 'step_5', type: 'email', name: 'Email Introduction', templateId: 'tpl_email_intro' }
    ],
    throttles: { dailyPerUser: 10, sendWindow: '9:00-17:00' },
    stats: { sent: 127, connected: 34, replied: 12, meetings: 3 }
  },
  {
    id: 'sq_demo_2', 
    name: 'Cold Email - Equipment Financing',
    status: 'paused',
    steps: [
      { id: 'step_a', type: 'email', name: 'Initial Outreach', templateId: 'tpl_cold_1' },
      { id: 'step_b', type: 'wait', name: 'Wait 5 days', waitHours: 120 },
      { id: 'step_c', type: 'email', name: 'Follow-up', templateId: 'tpl_cold_2' }
    ],
    throttles: { dailyPerUser: 50 },
    stats: { sent: 342, opened: 89, clicked: 23, replied: 7 }
  }
];

// GET /api/marketing/sequences
r.get('/', requireRole(['admin','marketing']), (req, res) => {
  res.json({ ok: true, items: sequences });
});

// POST /api/marketing/sequences  
r.post('/', requireRole(['admin','marketing']), (req, res) => {
  const seq = { 
    id: 'sq_' + Date.now(), 
    name: req.body?.name || 'Untitled Sequence', 
    status: req.body?.status || 'draft',
    steps: req.body?.steps || [], 
    throttles: req.body?.throttles || { dailyPerUser: 10 },
    stats: { sent: 0, connected: 0, replied: 0, meetings: 0 }
  };
  sequences = [seq, ...sequences];
  res.status(201).json({ ok: true, item: seq });
});

// GET /api/marketing/sequences/:id
r.get('/:id', requireRole(['admin','marketing']), (req, res) => {
  const seq = sequences.find(s => s.id === req.params.id);
  res.json({ ok: true, item: seq || null });
});

// PATCH /api/marketing/sequences/:id
r.patch('/:id', requireRole(['admin','marketing']), (req, res) => {
  const index = sequences.findIndex(s => s.id === req.params.id);
  if (index >= 0) {
    sequences[index] = { ...sequences[index], ...req.body };
  }
  res.json({ ok: true });
});

// DELETE /api/marketing/sequences/:id
r.delete('/:id', requireRole(['admin','marketing']), (req, res) => {
  sequences = sequences.filter(s => s.id !== req.params.id);
  res.json({ ok: true });
});

// POST /api/marketing/sequences/:id/start
r.post('/:id/start', requireRole(['admin','marketing']), (req, res) => {
  const index = sequences.findIndex(s => s.id === req.params.id);
  if (index >= 0) {
    sequences[index].status = 'active';
  }
  res.json({ ok: true, status: 'active' });
});

// POST /api/marketing/sequences/:id/pause
r.post('/:id/pause', requireRole(['admin','marketing']), (req, res) => {
  const index = sequences.findIndex(s => s.id === req.params.id);
  if (index >= 0) {
    sequences[index].status = 'paused';
  }
  res.json({ ok: true, status: 'paused' });
});

export default r;