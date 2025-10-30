import express from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
const router = express.Router();
// Office 365 configuration - Azure App Registration
const msalConfig = {
    auth: {
        clientId: process.env.O365_CLIENT_ID,
        clientSecret: process.env.O365_CLIENT_SECRET,
        authority: 'https://login.microsoftonline.com/common'
    }
};
let msalInstance;
try {
    msalInstance = new ConfidentialClientApplication(msalConfig);
}
catch (error) {
    console.log('⚠️ [O365] MSAL not configured for development - using mock responses');
}
/**
 * GET /api/integrations/o365/auth
 * Initiate Office 365 OAuth2 flow
 */
router.get('/auth', (req, res) => {
    console.log('🔐 [O365] OAuth2 authentication initiated');
    // Use real Azure App Registration credentials
    if (!msalInstance) {
        console.log('🔐 [O365] MSAL instance not initialized - credentials missing');
        return res.status(400).json({ error: 'Office 365 not configured' });
    }
    const authCodeUrlParameters = {
        scopes: ['user.read', 'calendars.readwrite', 'tasks.readwrite'],
        redirectUri: `${req.protocol}://${req.get('host')}/api/integrations/o365/callback`,
    };
    msalInstance.getAuthCodeUrl(authCodeUrlParameters)
        .then((response) => {
        res.redirect(response);
    })
        .catch((error) => {
        console.error('❌ [O365] Auth URL generation failed:', error);
        res.status(500).json({ error: 'Failed to initiate OAuth flow' });
    });
});
/**
 * GET /api/integrations/o365/callback
 * Handle OAuth2 callback
 */
router.get('/callback', async (req, res) => {
    console.log('🔄 [O365] OAuth2 callback received');
    const { code, state } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
    }
    if (!msalInstance) {
        console.log('❌ [O365] MSAL instance not available for token exchange');
        return res.status(400).json({ error: 'Office 365 not properly configured' });
    }
    try {
        const tokenRequest = {
            code: code,
            scopes: ['user.read', 'calendars.readwrite', 'tasks.readwrite'],
            redirectUri: `${req.protocol}://${req.get('host')}/api/integrations/o365/callback`,
        };
        const response = await msalInstance.acquireTokenByCode(tokenRequest);
        // Store tokens in database (implementation needed)
        console.log('✅ [O365] Access token acquired successfully');
        res.redirect('/calendar?connected=true');
    }
    catch (error) {
        console.error('❌ [O365] Token acquisition failed:', error);
        res.status(500).json({ error: 'Failed to acquire access token' });
    }
});
/**
 * GET /api/integrations/o365/status
 * Check Office 365 connection status
 */
router.get('/status', (req, res) => {
    console.log('📊 [O365] Status check requested');
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const hasCredentials = !!(process.env.O365_CLIENT_ID && process.env.O365_CLIENT_SECRET);
    console.log('📊 [O365] Credentials available:', hasCredentials);
    console.log('📊 [O365] Client ID present:', !!process.env.O365_CLIENT_ID);
    console.log('📊 [O365] Client Secret present:', !!process.env.O365_CLIENT_SECRET);
    console.log('📊 [O365] Using real Azure credentials');
    // Use real Azure App Registration credentials
    const clientId = process.env.O365_CLIENT_ID;
    const clientSecret = process.env.O365_CLIENT_SECRET;
    const hasRealCredentials = !!(clientId && clientSecret);
    console.log('📊 [O365] Real clientId available:', !!clientId);
    console.log('📊 [O365] Real clientSecret available:', !!clientSecret);
    console.log('📊 [O365] hasRealCredentials:', hasRealCredentials);
    const status = {
        connected: false, // User is not connected yet - they need to click connect
        hasCredentials: hasRealCredentials,
        user: null, // No user connected yet
        scopes: ['user.read', 'calendars.readwrite', 'tasks.readwrite'],
        status: hasRealCredentials ? 'ready_to_connect' : 'needs_configuration'
    };
    console.log('📊 [O365] Status response:', status);
    res.json(status);
});
/**
 * DELETE /api/integrations/o365/disconnect
 * Disconnect Office 365 integration
 */
router.delete('/disconnect', (req, res) => {
    console.log('🔌 [O365] Disconnection requested');
    // In production, remove tokens from database
    res.json({
        success: true,
        message: 'Office 365 integration disconnected successfully'
    });
});
export default router;
