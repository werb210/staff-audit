import { Router } from 'express';
import rateLimit from 'express-rate-limit';
const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 60 });
// Mock database layer for campaigns - replace with actual DB implementation
const mockDb = {
    campaigns: new Map(),
    recipients: new Map(),
    jobs: new Map(),
    events: new Map(),
    // Helper methods
    generateId: () => `camp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    // Campaign operations
    createCampaign: (data) => {
        const id = mockDb.generateId();
        const campaign = { id, ...data, createdAt: new Date().toISOString() };
        mockDb.campaigns.set(id, campaign);
        return campaign;
    },
    getCampaigns: () => Array.from(mockDb.campaigns.values()),
    getCampaign: (id) => mockDb.campaigns.get(id),
    updateCampaignStatus: (id, status) => {
        const campaign = mockDb.campaigns.get(id);
        if (campaign) {
            campaign.status = status;
            campaign.updatedAt = new Date().toISOString();
        }
        return campaign;
    },
    // Recipients operations
    addRecipient: (data) => {
        const id = mockDb.generateId();
        const recipient = { id, ...data };
        mockDb.recipients.set(id, recipient);
        return recipient;
    },
    getRecipients: (campaignId) => Array.from(mockDb.recipients.values()).filter(r => r.campaign_id === campaignId),
    countRecipients: (campaignId, status) => {
        const recipients = mockDb.getRecipients(campaignId);
        return status ? recipients.filter(r => r.status === status).length : recipients.length;
    },
    // Events operations
    addEvent: (data) => {
        const id = mockDb.generateId();
        const event = { id, ...data, createdAt: new Date().toISOString() };
        mockDb.events.set(id, event);
        return event;
    }
};
// Utility functions
function buildUtm(url, opts) {
    if (!url)
        return url;
    const u = new URL(url);
    if (opts.source)
        u.searchParams.set('utm_source', opts.source);
    if (opts.medium)
        u.searchParams.set('utm_medium', opts.medium);
    if (opts.campaign)
        u.searchParams.set('utm_campaign', opts.campaign);
    if (opts.content)
        u.searchParams.set('utm_content', opts.content);
    return u.toString();
}
function unsubscribeLink(contactId) {
    const crypto = require('crypto');
    const token = crypto.createHash('sha256').update(`unsub:${contactId}`).digest('hex').slice(0, 32);
    const base = process.env.PUBLIC_PORTAL_ORIGIN || 'https://example.com';
    return `${base}/unsubscribe?c=${contactId}&t=${token}`;
}
function render(template, ctx) {
    return (template || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
        const parts = String(path).split('.').map((p) => p.trim()).filter(Boolean);
        let cur = ctx;
        for (const p of parts)
            cur = (cur && p in cur) ? cur[p] : '';
        return cur ?? '';
    });
}
function stateToAudience(state) {
    const mapping = {
        'New': 'clients',
        'In Progress': 'clients',
        'Connected': 'clients',
        'Lenders': 'lenders',
        'Referrers': 'referrers',
        'Evangelists': 'evangelists'
    };
    return mapping[state || ''] || 'clients';
}
// Create campaign
router.post('/', limiter, async (req, res) => {
    try {
        const { name, channel, segmentId, templateId, audience = 'clients', sendAt } = req.body || {};
        if (!name || !channel || !templateId) {
            return res.status(400).json({ ok: false, reason: 'missing_fields' });
        }
        const campaign = mockDb.createCampaign({
            name,
            channel,
            segment_id: segmentId || null,
            template_id: templateId,
            audience,
            send_at: sendAt || null,
            status: 'draft',
            created_by: req.user?.id
        });
        console.log(`📧 [CAMPAIGNS] Created campaign: ${name} (${channel})`);
        res.json({ ok: true, item: campaign });
    }
    catch (error) {
        console.error('Campaign creation error:', error);
        res.status(500).json({ ok: false, error: 'Failed to create campaign' });
    }
});
// List campaigns
router.get('/', limiter, async (req, res) => {
    try {
        const campaigns = mockDb.getCampaigns();
        res.json({ ok: true, items: campaigns });
    }
    catch (error) {
        console.error('Campaigns fetch error:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch campaigns' });
    }
});
// Get campaign details
router.get('/:id', limiter, async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = mockDb.getCampaign(id);
        if (!campaign) {
            return res.status(404).json({ ok: false, reason: 'not_found' });
        }
        res.json({ ok: true, item: campaign });
    }
    catch (error) {
        console.error('Campaign fetch error:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch campaign' });
    }
});
// Prepare recipients (snapshot segment → campaign_recipients)
router.post('/:id/prepare', limiter, async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = mockDb.getCampaign(id);
        if (!campaign) {
            return res.status(404).json({ ok: false, reason: 'not_found' });
        }
        // Mock contacts - in real implementation, fetch from segments or contacts API
        const mockContacts = [
            { id: 'contact-1', firstName: 'John', lastName: 'Smith', email: 'john@example.com', phone: '+1234567890', state: 'New' },
            { id: 'contact-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '+1234567891', state: 'In Progress' }
        ];
        let enqueued = 0;
        for (const contact of mockContacts) {
            const mapped = stateToAudience(contact.state);
            if (campaign.audience !== 'all' && campaign.audience !== mapped) {
                mockDb.addEvent({
                    campaign_id: id,
                    contact_id: contact.id,
                    type: 'skipped',
                    meta: { reason: 'audience_mismatch', state: contact.state }
                });
                continue;
            }
            mockDb.addRecipient({
                campaign_id: id,
                contact_id: contact.id,
                address: campaign.channel === 'sms' ? (contact.phone || '') : (contact.email || ''),
                state: contact.state || null,
                dnc: false,
                status: 'queued'
            });
            enqueued++;
        }
        mockDb.updateCampaignStatus(id, 'scheduled');
        console.log(`📧 [CAMPAIGNS] Prepared ${enqueued} recipients for campaign: ${id}`);
        res.json({ ok: true, enqueued });
    }
    catch (error) {
        console.error('Campaign preparation error:', error);
        res.status(500).json({ ok: false, error: 'Failed to prepare campaign' });
    }
});
// Campaign controls
router.post('/:id/pause', limiter, async (req, res) => {
    try {
        const campaign = mockDb.updateCampaignStatus(req.params.id, 'paused');
        if (!campaign) {
            return res.status(404).json({ ok: false, reason: 'not_found' });
        }
        console.log(`⏸️ [CAMPAIGNS] Paused campaign: ${req.params.id}`);
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: 'Failed to pause campaign' });
    }
});
router.post('/:id/resume', limiter, async (req, res) => {
    try {
        const campaign = mockDb.updateCampaignStatus(req.params.id, 'running');
        if (!campaign) {
            return res.status(404).json({ ok: false, reason: 'not_found' });
        }
        console.log(`▶️ [CAMPAIGNS] Resumed campaign: ${req.params.id}`);
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: 'Failed to resume campaign' });
    }
});
router.post('/:id/cancel', limiter, async (req, res) => {
    try {
        const campaign = mockDb.updateCampaignStatus(req.params.id, 'canceled');
        if (!campaign) {
            return res.status(404).json({ ok: false, reason: 'not_found' });
        }
        console.log(`❌ [CAMPAIGNS] Canceled campaign: ${req.params.id}`);
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: 'Failed to cancel campaign' });
    }
});
// Get campaign progress
router.get('/:id/progress', limiter, async (req, res) => {
    try {
        const { id } = req.params;
        const total = mockDb.countRecipients(id);
        const sent = mockDb.countRecipients(id, 'sent');
        const failed = mockDb.countRecipients(id, 'failed');
        const skipped = Array.from(mockDb.events.values())
            .filter(e => e.campaign_id === id && e.type === 'skipped').length;
        res.json({
            ok: true,
            total,
            sent,
            failed,
            skipped,
            remaining: total - sent - failed
        });
    }
    catch (error) {
        console.error('Progress fetch error:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch progress' });
    }
});
// Preview campaign (first N renders)
router.get('/:id/preview', limiter, async (req, res) => {
    try {
        const { id } = req.params;
        const limit = Math.min(Number(req.query.limit || 20), 100);
        const campaign = mockDb.getCampaign(id);
        if (!campaign) {
            return res.status(404).json({ ok: false });
        }
        // Mock template - in real implementation, fetch from templates API
        const mockTemplate = {
            body: 'Hi {{contact.firstName}}, this is a test message from {{company.name}}. {{links.unsubscribe}}',
            subject: campaign.channel === 'email' ? 'Test Subject - {{contact.firstName}}' : undefined
        };
        const recipients = mockDb.getRecipients(id).slice(0, limit);
        const items = [];
        for (const recipient of recipients) {
            // Mock contact data - in real implementation, fetch from contacts API
            const contact = { id: recipient.contact_id, firstName: 'John', lastName: 'Smith' };
            const ctx = {
                contact,
                staff: req.user || {},
                company: { name: 'Boreal Financial' },
                links: { unsubscribe: unsubscribeLink(contact.id) }
            };
            if (campaign.channel === 'sms') {
                items.push({
                    contactId: contact.id,
                    text: render(mockTemplate.body, ctx)
                });
            }
            else {
                const html = render(mockTemplate.body, ctx);
                const subject = render(mockTemplate.subject || '', ctx);
                items.push({
                    contactId: contact.id,
                    subject,
                    html
                });
            }
        }
        res.json({ ok: true, items });
    }
    catch (error) {
        console.error('Preview generation error:', error);
        res.status(500).json({ ok: false, error: 'Failed to generate preview' });
    }
});
export default router;
