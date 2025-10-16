import { Router } from 'express';
import { authBearer } from '../middleware/authBearer.js';
import { requireRoles } from '../middleware/rbac.js';

const r = Router();
r.use(authBearer);

// In-memory stores for demo (replace with database)
let campaigns = []; 
let sequences = []; 
let templates = []; 
let audiences = []; 
let assets = []; 
let experiments = [];

// Overview endpoint
r.get('/overview', requireRoles('admin','marketing'), async (req, res) => {
  res.json({ 
    ok: true, 
    kpis: { 
      MQLs: 12, 
      meetings: 6, 
      replyRate: 0.21, 
      spendToDate: 1200, 
      CPL: 100, 
      ROI: 2.6 
    } 
  });
});

// CRUD helper function
function crud(path, store) {
  r.get(`/${path}`, requireRoles('admin','marketing'), (req, res) => 
    res.json({ ok: true, items: store }));
  
  r.post(`/${path}`, requireRoles('admin','marketing'), (req, res) => { 
    const item = { id: `${path.slice(0,2)}_${Date.now()}`, ...req.body }; 
    store.unshift(item); 
    res.status(201).json({ ok: true, item }); 
  });
  
  r.get(`/${path}/:id`, requireRoles('admin','marketing'), (req, res) => 
    res.json({ ok: true, item: store.find(x => x.id === req.params.id) || null }));
  
  r.patch(`/${path}/:id`, requireRoles('admin','marketing'), (req, res) => { 
    const index = store.findIndex(x => x.id === req.params.id);
    if (index >= 0) store[index] = { ...store[index], ...req.body };
    res.json({ ok: true }); 
  });
  
  r.delete(`/${path}/:id`, requireRoles('admin','marketing'), (req, res) => { 
    const index = store.findIndex(x => x.id === req.params.id);
    if (index >= 0) store.splice(index, 1);
    res.json({ ok: true }); 
  });
}

// Set up CRUD routes for all entities
crud('campaigns', campaigns); 
crud('sequences', sequences); 
crud('templates', templates);

// Debug: List all templates
r.get('/templates/debug', requireRoles('admin','marketing'), (req, res) => {
  res.json({ ok: true, count: templates.length, items: templates });
});
crud('audiences', audiences); 
crud('assets', assets); 
crud('experiments', experiments);

// Add some sample templates for the UI
templates.push(
  { id: 'tpl_connect_1', name: 'LinkedIn Connect - SaaS', type: 'linkedinConnect', body: 'Hi {{firstName}}, I noticed you work at {{company}}. Would love to connect!' },
  { id: 'tpl_followup_1', name: 'LinkedIn Follow-up', type: 'linkedinMessage', body: 'Thanks for connecting {{firstName}}! I help SaaS companies with {{service}}.' },
  { id: 'tpl_email_intro', name: 'Email Introduction', type: 'email', subject: 'Quick question about {{company}}', body: 'Hi {{firstName}},\n\nI hope this email finds you well...' },
  { id: 'tpl_cold_1', name: 'Cold Email - Equipment', type: 'email', subject: 'Equipment financing for {{company}}', body: 'Hi {{firstName}},\n\nSaw {{company}} is growing fast...' }
);

// Attribution endpoints
r.get('/attribution', requireRoles('admin','marketing'), (req, res) => 
  res.json({ ok: true, events: [] }));

r.post('/attribution/events', requireRoles('admin','marketing'), (req, res) => 
  res.status(202).json({ 
    ok: true, 
    received: Array.isArray(req.body) ? req.body.length : 1 
  }));

// Google Ads campaigns endpoint - returns empty for ErrorBanner testing
r.get('/google-ads/campaigns', async (req, res) => {
  try {
    console.log('✅ [MARKETING] Google Ads campaigns requested - returning empty array to trigger ErrorBanner');
    res.json([]); // Empty array triggers ErrorBanner in frontend
  } catch (error) {
    console.error('Google Ads error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Create Google Ads campaign endpoint
r.post('/google-ads/campaigns', async (req, res) => {
  try {
    const campaignData = req.body;
    console.log('✅ [MARKETING] Google Ads campaign creation requested:', campaignData);
    
    res.json({ 
      success: true, 
      message: 'Campaign creation not implemented - Google Ads API integration required',
      campaignId: 'mock-' + Date.now()
    });
  } catch (error) {
    console.error('Google Ads campaign creation error:', error);
    res.status(500).json({ error: 'Failed to create Google Ads campaign' });
  }
});

// Update campaign status endpoint  
r.patch('/google-ads/campaigns/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('✅ [MARKETING] Google Ads campaign status update requested:', { id, status });
    
    res.json({ 
      success: true, 
      message: 'Status update not implemented - Google Ads API integration required'
    });
  } catch (error) {
    console.error('Google Ads status update error:', error);
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

// LinkedIn campaigns endpoint - returns empty for ErrorBanner testing
r.get('/linkedin/campaigns', async (req, res) => {
  try {
    console.log('✅ [MARKETING] LinkedIn campaigns requested - returning empty array to trigger ErrorBanner');
    res.json([]); // Empty array triggers ErrorBanner in frontend
  } catch (error) {
    console.error('LinkedIn campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch LinkedIn campaigns' });
  }
});

// Mount marketing auth routes
import marketingAuthRoutes from './marketing-auth.js';
r.use('/', marketingAuthRoutes);

// Mount marketing AI routes
import marketingAiRoutes from './marketing-ai.js';
r.use('/', marketingAiRoutes);

export default r;