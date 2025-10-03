import { Router } from 'express';
import { tokenService } from '../../services/tokenService';

const router = Router();

// OAuth configuration for different providers
const OAUTH_CONFIGS = {
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || '/api/auth/microsoft/callback',
    scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read'
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback',
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar'
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || '/api/auth/linkedin/callback',
    scope: 'r_liteprofile r_emailaddress w_member_social'
  }
};

// Microsoft Office 365 OAuth flow
router.get('/microsoft', (req: any, res: any) => {
  const { userId } = req.query;
  const config = OAUTH_CONFIGS.microsoft;
  
  if (!config.clientId) {
    return res.status(500).json({ error: 'Microsoft OAuth not configured' });
  }

  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', `${req.protocol}://${req.get('host')}${config.redirectUri}`);
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', userId as string || '');
  authUrl.searchParams.set('response_mode', 'query');

  res.redirect(authUrl.toString());
});

router.get('/microsoft/callback', async (req: any, res: any) => {
  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      return res.redirect('/staff/settings?error=oauth_error');
    }

    if (!code || !userId) {
      return res.redirect('/staff/settings?error=missing_params');
    }

    const config = OAUTH_CONFIGS.microsoft;
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        code: code as string,
        redirect_uri: `${req.protocol}://${req.get('host')}${config.redirectUri}`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Microsoft OAuth token error:', tokens);
      return res.redirect('/staff/settings?error=token_exchange');
    }

    // Calculate expiration
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Save tokens
    await tokenService.saveToken(
      userId as string,
      'microsoft',
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      tokens.scope
    );

    res.redirect('/staff/settings?connected=microsoft');
  } catch (error: unknown) {
    console.error('Microsoft OAuth callback error:', error);
    res.redirect('/staff/settings?error=callback_error');
  }
});

// Google OAuth flow
router.get('/google', (req: any, res: any) => {
  const { userId } = req.query;
  const config = OAUTH_CONFIGS.google;
  
  if (!config.clientId) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', `${req.protocol}://${req.get('host')}${config.redirectUri}`);
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', userId as string || '');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  res.redirect(authUrl.toString());
});

router.get('/google/callback', async (req: any, res: any) => {
  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      return res.redirect('/staff/settings?error=oauth_error');
    }

    if (!code || !userId) {
      return res.redirect('/staff/settings?error=missing_params');
    }

    const config = OAUTH_CONFIGS.google;
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        code: code as string,
        redirect_uri: `${req.protocol}://${req.get('host')}${config.redirectUri}`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google OAuth token error:', tokens);
      return res.redirect('/staff/settings?error=token_exchange');
    }

    // Calculate expiration
    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined;

    // Save tokens
    await tokenService.saveToken(
      userId as string,
      'google',
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      tokens.scope
    );

    res.redirect('/staff/settings?connected=google');
  } catch (error: unknown) {
    console.error('Google OAuth callback error:', error);
    res.redirect('/staff/settings?error=callback_error');
  }
});

// LinkedIn OAuth flow
router.get('/linkedin', (req: any, res: any) => {
  const { userId } = req.query;
  const config = OAUTH_CONFIGS.linkedin;
  
  if (!config.clientId) {
    return res.status(500).json({ error: 'LinkedIn OAuth not configured' });
  }

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', `${req.protocol}://${req.get('host')}${config.redirectUri}`);
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', userId as string || '');

  res.redirect(authUrl.toString());
});

router.get('/linkedin/callback', async (req: any, res: any) => {
  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      return res.redirect('/staff/settings?error=oauth_error');
    }

    if (!code || !userId) {
      return res.redirect('/staff/settings?error=missing_params');
    }

    const config = OAUTH_CONFIGS.linkedin;
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        code: code as string,
        redirect_uri: `${req.protocol}://${req.get('host')}${config.redirectUri}`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('LinkedIn OAuth token error:', tokens);
      return res.redirect('/staff/settings?error=token_exchange');
    }

    // Calculate expiration
    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined;

    // Save tokens
    await tokenService.saveToken(
      userId as string,
      'linkedin',
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      tokens.scope
    );

    res.redirect('/staff/settings?connected=linkedin');
  } catch (error: unknown) {
    console.error('LinkedIn OAuth callback error:', error);
    res.redirect('/staff/settings?error=callback_error');
  }
});

export default router;