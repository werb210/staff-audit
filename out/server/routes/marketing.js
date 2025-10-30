import { Router } from 'express';
const router = Router();
// Marketing campaigns endpoint
router.get('/campaigns', async (req, res) => {
    try {
        // Return demo campaigns data for now
        const campaigns = [
            {
                id: 'campaign-1',
                name: 'BF Small Business Loans Q4',
                platform: 'Google Ads',
                status: 'active',
                budget: 5000,
                spent: 3200,
                leads: 45,
                conversions: 12
            },
            {
                id: 'campaign-2',
                name: 'SLF Construction Finance',
                platform: 'LinkedIn',
                status: 'active',
                budget: 3000,
                spent: 1800,
                leads: 23,
                conversions: 8
            }
        ];
        console.log('📊 [MARKETING] Returning demo campaigns data');
        res.json(campaigns);
    }
    catch (error) {
        console.error('Marketing campaigns error:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});
// Connected accounts endpoint
router.get('/connected-accounts', async (req, res) => {
    try {
        const accounts = {
            office365: { connected: true, email: 'staff@borealfinancial.com', expires: '2025-12-31' },
            googleAds: { connected: true, accountId: 'GA-123456789', expires: '2025-11-15' },
            linkedin: { connected: false, lastConnected: null },
            twitter: { connected: false, lastConnected: null },
            sendgrid: { connected: true, apiKeyStatus: 'active' }
        };
        console.log('🔗 [MARKETING] Returning connected accounts status');
        res.json(accounts);
    }
    catch (error) {
        console.error('Connected accounts error:', error);
        res.status(500).json({ error: 'Failed to fetch connected accounts' });
    }
});
// Google Ads Campaigns endpoint
router.get('/google-ads/campaigns', async (req, res) => {
    try {
        // For now, return empty array to trigger ErrorBanner
        // In production, this would integrate with Google Ads API
        console.log('🔴 Google Ads campaigns requested - returning empty array (no real integration)');
        res.json([]);
    }
    catch (error) {
        console.error('Google Ads API error:', error);
        res.status(500).json({ error: 'Failed to fetch Google Ads campaigns' });
    }
});
// Create Google Ads campaign endpoint
router.post('/google-ads/campaigns', async (req, res) => {
    try {
        const campaignData = req.body;
        console.log('🔴 Google Ads campaign creation requested:', campaignData);
        // For now, return mock success response
        // In production, this would create campaign via Google Ads API
        res.json({
            success: true,
            message: 'Campaign creation not implemented - Google Ads API integration required',
            campaignId: 'mock-' + Date.now()
        });
    }
    catch (error) {
        console.error('Google Ads campaign creation error:', error);
        res.status(500).json({ error: 'Failed to create Google Ads campaign' });
    }
});
// Update campaign status endpoint
router.patch('/google-ads/campaigns/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        console.log('🔴 Google Ads campaign status update requested:', { id, status });
        // For now, return mock success response
        res.json({
            success: true,
            message: 'Status update not implemented - Google Ads API integration required'
        });
    }
    catch (error) {
        console.error('Google Ads status update error:', error);
        res.status(500).json({ error: 'Failed to update campaign status' });
    }
});
// Ads status endpoint
router.get('/ads/status', async (_req, res) => {
    res.json({
        ok: true,
        running: false,
        connectedAccounts: {
            googleAds: false,
            meta: false,
            linkedin: false
        }
    });
});
export default router;
