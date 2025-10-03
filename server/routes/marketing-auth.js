import express from 'express';

const r = express.Router();

// Connected accounts status
r.get('/connected-accounts', async (req, res) => {
  try {
    console.log('📊 [MARKETING-AUTH] Connected accounts requested');
    
    // In a real implementation, this would query the database for user's connected accounts
    const mockAccounts = [
      {
        service: 'google_ads',
        status: 'disconnected',
        accountName: 'Google Ads Account'
      },
      {
        service: 'linkedin',
        status: 'disconnected', 
        accountName: 'LinkedIn Business Account'
      },
      {
        service: 'o365',
        status: 'connected',
        email: 'marketing@borealfinancial.com',
        accountName: 'Microsoft 365',
        connectedAt: '2025-08-15T10:30:00Z',
        scopes: ['Calendar.ReadWrite', 'Mail.Send', 'Contacts.ReadWrite']
      },
      {
        service: 'sendgrid',
        status: 'connected',
        email: 'marketing@borealfinancial.com', 
        accountName: 'SendGrid Email',
        connectedAt: '2025-08-10T09:15:00Z'
      }
    ];
    
    res.json({ accounts: mockAccounts });
  } catch (error) {
    console.error('Connected accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch connected accounts' });
  }
});

// Initiate OAuth connection
r.post('/connect/:service', async (req, res) => {
  try {
    const { service } = req.params;
    console.log(`🔗 [MARKETING-AUTH] Initiating ${service} OAuth connection`);
    
    // Generate OAuth URLs for different services
    const oauthUrls = {
      google_ads: `https://accounts.google.com/o/oauth2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=${encodeURIComponent(process.env.BASE_URL || 'http://localhost:5000')}/api/marketing/callback/google_ads&scope=https://www.googleapis.com/auth/adwords&response_type=code&state=google_ads`,
      linkedin: `https://www.linkedin.com/oauth/v2/authorization?client_id=YOUR_LINKEDIN_CLIENT_ID&redirect_uri=${encodeURIComponent(process.env.BASE_URL || 'http://localhost:5000')}/api/marketing/callback/linkedin&scope=r_liteprofile%20r_emailaddress%20w_member_social&response_type=code&state=linkedin`,
      o365: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_MICROSOFT_CLIENT_ID&redirect_uri=${encodeURIComponent(process.env.BASE_URL || 'http://localhost:5000')}/api/marketing/callback/o365&scope=https://graph.microsoft.com/Calendar.ReadWrite%20https://graph.microsoft.com/Mail.Send%20https://graph.microsoft.com/Contacts.ReadWrite&response_type=code&state=o365`,
      sendgrid: null // SendGrid uses API key, not OAuth
    };
    
    if (service === 'sendgrid') {
      // For SendGrid, return instructions to add API key
      res.json({ 
        requiresApiKey: true,
        message: 'SendGrid requires an API key. Please add your SendGrid API key to environment variables.',
        instructions: 'Go to SendGrid Dashboard → Settings → API Keys → Create API Key with "Full Access"'
      });
    } else {
      res.json({ 
        authUrl: oauthUrls[service] || `#oauth-not-configured-for-${service}`,
        service: service
      });
    }
  } catch (error) {
    console.error(`Connect ${req.params.service} error:`, error);
    res.status(500).json({ error: `Failed to initiate ${req.params.service} connection` });
  }
});

// Check connection status (polling endpoint)
r.get('/connect/:service/status', async (req, res) => {
  try {
    const { service } = req.params;
    console.log(`📋 [MARKETING-AUTH] Checking ${service} connection status`);
    
    // In real implementation, this would check if OAuth callback was completed
    // For now, return false (not connected)
    res.json({ connected: false, service: service });
  } catch (error) {
    console.error(`Status check ${req.params.service} error:`, error);
    res.status(500).json({ error: `Failed to check ${req.params.service} status` });
  }
});

// OAuth callbacks
r.get('/callback/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const { code, state } = req.query;
    
    console.log(`🎯 [MARKETING-AUTH] OAuth callback for ${service}, code: ${code?.substring(0, 10)}...`);
    
    // In real implementation:
    // 1. Exchange code for access token
    // 2. Store token in database
    // 3. Update user's connected accounts
    
    // For now, redirect back to marketing page with success message
    res.redirect('/staff/marketing?connected=' + service);
  } catch (error) {
    console.error(`Callback ${req.params.service} error:`, error);
    res.redirect('/staff/marketing?error=connection_failed');
  }
});

// Disconnect account
r.post('/disconnect/:service', async (req, res) => {
  try {
    const { service } = req.params;
    console.log(`🔌 [MARKETING-AUTH] Disconnecting ${service}`);
    
    // In real implementation, remove tokens from database
    res.json({ success: true, message: `${service} disconnected successfully` });
  } catch (error) {
    console.error(`Disconnect ${req.params.service} error:`, error);
    res.status(500).json({ error: `Failed to disconnect ${req.params.service}` });
  }
});

// Refresh connection
r.post('/refresh/:service', async (req, res) => {
  try {
    const { service } = req.params;
    console.log(`🔄 [MARKETING-AUTH] Refreshing ${service} connection`);
    
    // In real implementation, use refresh token to get new access token
    res.json({ success: true, message: `${service} connection refreshed` });
  } catch (error) {
    console.error(`Refresh ${req.params.service} error:`, error);
    res.status(500).json({ error: `Failed to refresh ${req.params.service}` });
  }
});

export default r;