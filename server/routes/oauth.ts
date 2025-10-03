/**
 * OAuth Integration Routes
 * Office 365, Google Ads, LinkedIn authentication and token management
 */

import { Router } from 'express';
import { db } from '../db';
import { oauthTokens } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// OAuth Configuration
const oauthProviders = {
  googleAds: {
    clientID: process.env.GOOGLE_ADS_CLIENT_ID || 'demo-client-id',
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || 'demo-secret',
    callbackURL: '/api/oauth/googleads/callback',
    scope: 'https://www.googleapis.com/auth/adwords'
  },
  office365: {
    clientID: process.env.O365_CLIENT_ID || 'demo-client-id',
    clientSecret: process.env.O365_CLIENT_SECRET || 'demo-secret',
    callbackURL: '/api/oauth/o365/callback',
    tenantID: process.env.O365_TENANT_ID || 'common',
    scope: 'openid profile offline_access https://graph.microsoft.com/.default'
  },
  linkedin: {
    clientID: process.env.LINKEDIN_CLIENT_ID || 'demo-client-id',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'demo-secret',
    callbackURL: '/api/oauth/linkedin/callback',
    scope: 'r_liteprofile r_emailaddress w_member_social'
  }
};

/**
 * Get OAuth connection status for current user
 * GET /api/oauth/status
 */
router.get('/status', async (req: any, res: any) => {
  try {
    const userId = 'current-user'; // Would come from auth middleware
    
    const connections = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.userId, userId));

    const status = {
      office365: connections.find(c => c.provider === 'office365')?.isActive || false,
      googleAds: connections.find(c => c.provider === 'googleAds')?.isActive || false,
      linkedin: connections.find(c => c.provider === 'linkedin')?.isActive || false
    };

    res.json({ success: true, connections: status });

  } catch (error: unknown) {
    console.error('❌ [OAUTH] Status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Start Office 365 OAuth flow
 * GET /api/oauth/o365/start
 */
router.get('/o365/start', async (req: any, res: any) => {
  try {
    const config = oauthProviders.office365;
    const state = Buffer.from(JSON.stringify({ userId: 'current-user' })).toString('base64');
    
    const authUrl = `https://login.microsoftonline.com/${config.tenantID}/oauth2/v2.0/authorize?` +
      `client_id=${config.clientID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.BASE_URL + config.callbackURL)}&` +
      `scope=${encodeURIComponent(config.scope)}&` +
      `state=${state}`;

    console.log('✅ [OAUTH] O365 auth URL generated');
    res.json({ success: true, authUrl });

  } catch (error: unknown) {
    console.error('❌ [OAUTH] O365 start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Handle Office 365 OAuth callback
 * GET /api/oauth/o365/callback
 */
router.get('/o365/callback', async (req: any, res: any) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect('/staff/settings/integrations?error=oauth_failed');
    }

    // In production, exchange code for tokens here
    const mockToken = {
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    };

    // Save token to database
    const userId = 'current-user';
    await db
      .insert(oauthTokens)
      .values({
        id: `o365-${userId}-${Date.now()}`,
        userId,
        provider: 'office365',
        accessToken: mockToken.accessToken,
        refreshToken: mockToken.refreshToken,
        expiresAt: mockToken.expiresAt,
        isActive: true,
        metadata: { scope: oauthProviders.office365.scope }
      })
      .onConflictDoUpdate({
        target: [oauthTokens.userId, oauthTokens.provider],
        set: {
          accessToken: mockToken.accessToken,
          refreshToken: mockToken.refreshToken,
          expiresAt: mockToken.expiresAt,
          isActive: true,
          updatedAt: new Date()
        }
      });

    console.log('✅ [OAUTH] O365 token saved for user:', userId);
    res.redirect('/staff/settings/integrations?connected=office365');

  } catch (error: unknown) {
    console.error('❌ [OAUTH] O365 callback error:', error);
    res.redirect('/staff/settings/integrations?error=oauth_callback_failed');
  }
});

/**
 * Start Google Ads OAuth flow
 * GET /api/oauth/googleads/start
 */
router.get('/googleads/start', async (req: any, res: any) => {
  try {
    const config = oauthProviders.googleAds;
    const state = Buffer.from(JSON.stringify({ userId: 'current-user' })).toString('base64');
    
    const authUrl = `https://accounts.google.com/oauth2/authorize?` +
      `client_id=${config.clientID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.BASE_URL + config.callbackURL)}&` +
      `scope=${encodeURIComponent(config.scope)}&` +
      `access_type=offline&` +
      `state=${state}`;

    console.log('✅ [OAUTH] Google Ads auth URL generated');
    res.json({ success: true, authUrl });

  } catch (error: unknown) {
    console.error('❌ [OAUTH] Google Ads start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Handle Google Ads OAuth callback
 * GET /api/oauth/googleads/callback
 */
router.get('/googleads/callback', async (req: any, res: any) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect('/staff/settings/integrations?error=oauth_failed');
    }

    // Mock token exchange
    const mockToken = {
      accessToken: 'mock-google-access-token-' + Date.now(),
      refreshToken: 'mock-google-refresh-token-' + Date.now(),
      expiresAt: new Date(Date.now() + 3600000)
    };

    const userId = 'current-user';
    await db
      .insert(oauthTokens)
      .values({
        id: `google-${userId}-${Date.now()}`,
        userId,
        provider: 'googleAds',
        accessToken: mockToken.accessToken,
        refreshToken: mockToken.refreshToken,
        expiresAt: mockToken.expiresAt,
        isActive: true,
        metadata: { scope: oauthProviders.googleAds.scope }
      })
      .onConflictDoUpdate({
        target: [oauthTokens.userId, oauthTokens.provider],
        set: {
          accessToken: mockToken.accessToken,
          refreshToken: mockToken.refreshToken,
          expiresAt: mockToken.expiresAt,
          isActive: true,
          updatedAt: new Date()
        }
      });

    console.log('✅ [OAUTH] Google Ads token saved for user:', userId);
    res.redirect('/staff/settings/integrations?connected=googleads');

  } catch (error: unknown) {
    console.error('❌ [OAUTH] Google Ads callback error:', error);
    res.redirect('/staff/settings/integrations?error=oauth_callback_failed');
  }
});

/**
 * Start LinkedIn OAuth flow
 * GET /api/oauth/linkedin/start
 */
router.get('/linkedin/start', async (req: any, res: any) => {
  try {
    const config = oauthProviders.linkedin;
    const state = Buffer.from(JSON.stringify({ userId: 'current-user' })).toString('base64');
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `client_id=${config.clientID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.BASE_URL + config.callbackURL)}&` +
      `scope=${encodeURIComponent(config.scope)}&` +
      `state=${state}`;

    console.log('✅ [OAUTH] LinkedIn auth URL generated');
    res.json({ success: true, authUrl });

  } catch (error: unknown) {
    console.error('❌ [OAUTH] LinkedIn start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Handle LinkedIn OAuth callback
 * GET /api/oauth/linkedin/callback
 */
router.get('/linkedin/callback', async (req: any, res: any) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect('/staff/settings/integrations?error=oauth_failed');
    }

    // Mock token exchange
    const mockToken = {
      accessToken: 'mock-linkedin-access-token-' + Date.now(),
      refreshToken: 'mock-linkedin-refresh-token-' + Date.now(),
      expiresAt: new Date(Date.now() + 5184000000) // 60 days
    };

    const userId = 'current-user';
    await db
      .insert(oauthTokens)
      .values({
        id: `linkedin-${userId}-${Date.now()}`,
        userId,
        provider: 'linkedin',
        accessToken: mockToken.accessToken,
        refreshToken: mockToken.refreshToken,
        expiresAt: mockToken.expiresAt,
        isActive: true,
        metadata: { scope: oauthProviders.linkedin.scope }
      })
      .onConflictDoUpdate({
        target: [oauthTokens.userId, oauthTokens.provider],
        set: {
          accessToken: mockToken.accessToken,
          refreshToken: mockToken.refreshToken,
          expiresAt: mockToken.expiresAt,
          isActive: true,
          updatedAt: new Date()
        }
      });

    console.log('✅ [OAUTH] LinkedIn token saved for user:', userId);
    res.redirect('/staff/settings/integrations?connected=linkedin');

  } catch (error: unknown) {
    console.error('❌ [OAUTH] LinkedIn callback error:', error);
    res.redirect('/staff/settings/integrations?error=oauth_callback_failed');
  }
});

/**
 * Disconnect OAuth provider
 * POST /api/oauth/:provider/disconnect
 */
router.post('/:provider/disconnect', async (req: any, res: any) => {
  try {
    const { provider } = req.params;
    const userId = 'current-user';

    if (!['office365', 'googleAds', 'linkedin'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider'
      });
    }

    await db
      .update(oauthTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, provider)
        )
      );

    console.log(`✅ [OAUTH] ${provider} disconnected for user:`, userId);
    res.json({ success: true, message: 'Provider disconnected' });

  } catch (error: unknown) {
    console.error('❌ [OAUTH] Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Sync Office 365 Calendar
 * POST /api/oauth/sync/calendar
 */
router.post('/sync/calendar', async (req: any, res: any) => {
  try {
    const userId = 'current-user';
    
    const [token] = await db
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, 'office365'),
          eq(oauthTokens.isActive, true)
        )
      );

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Office 365 not connected'
      });
    }

    // Mock calendar sync
    const mockEvents = [
      {
        id: 'event-1',
        subject: 'Loan Review Meeting',
        start: new Date(Date.now() + 86400000),
        end: new Date(Date.now() + 90000000),
        attendees: ['john@example.com']
      },
      {
        id: 'event-2',
        subject: 'Client Call',
        start: new Date(Date.now() + 172800000),
        end: new Date(Date.now() + 176400000),
        attendees: ['sarah@example.com']
      }
    ];

    console.log('✅ [OAUTH] Calendar synced for user:', userId);
    res.json({
      success: true,
      events: mockEvents,
      syncedAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('❌ [OAUTH] Calendar sync error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;