import { Router } from 'express';
import { db } from '../db';
import { connectedAccounts, users } from '../../shared/schema';
import crypto from 'crypto';
const router = Router();
// OAuth configuration for different providers
const OAUTH_CONFIGS = {
    microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID || 'mock-client-id',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'mock-secret',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/oauth/callback/microsoft',
        scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Tasks.ReadWrite',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || 'mock-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-secret',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/oauth/callback/google',
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/analytics.readonly',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token'
    },
    linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID || 'mock-client-id',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'mock-secret',
        redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5000/api/oauth/callback/linkedin',
        scope: 'r_liteprofile r_emailaddress w_member_social r_ads r_ads_reporting',
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken'
    }
};
// GET /api/oauth/connect/:provider - Initiate OAuth flow
router.get('/connect/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        console.log(`🔗 [OAUTH] Initiating ${provider} OAuth flow...`);
        if (!OAUTH_CONFIGS[provider]) {
            return res.status(400).json({
                success: false,
                error: `Unsupported provider: ${provider}`
            });
        }
        const config = OAUTH_CONFIGS[provider];
        // Generate state parameter for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        // Store state in session or temporary storage (in production, use secure session)
        req.session = req.session || {};
        req.session.oauthState = state;
        req.session.oauthProvider = provider;
        // Build authorization URL
        const authUrl = new URL(config.authUrl);
        authUrl.searchParams.set('client_id', config.clientId);
        authUrl.searchParams.set('redirect_uri', config.redirectUri);
        authUrl.searchParams.set('scope', config.scope);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', state);
        // Microsoft-specific parameters
        if (provider === 'microsoft') {
            authUrl.searchParams.set('response_mode', 'query');
        }
        // Google-specific parameters
        if (provider === 'google') {
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('prompt', 'consent');
        }
        console.log(`✅ [OAUTH] Generated ${provider} auth URL`);
        res.json({
            success: true,
            authUrl: authUrl.toString(),
            provider
        });
    }
    catch (error) {
        console.error('❌ [OAUTH] Error initiating OAuth flow:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate OAuth flow',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// GET /api/oauth/callback/:provider - Handle OAuth callback
router.get('/callback/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const { code, state, error: oauthError } = req.query;
        console.log(`🔗 [OAUTH] Handling ${provider} OAuth callback...`);
        if (oauthError) {
            console.error(`❌ [OAUTH] OAuth error for ${provider}:`, oauthError);
            return res.redirect(`/staff/settings?error=${encodeURIComponent(`OAuth error: ${oauthError}`)}`);
        }
        if (!code) {
            return res.redirect(`/staff/settings?error=${encodeURIComponent('No authorization code received')}`);
        }
        // Verify state parameter (in production, check against stored session state)
        if (!state) {
            return res.redirect(`/staff/settings?error=${encodeURIComponent('Missing state parameter')}`);
        }
        const config = OAUTH_CONFIGS[provider];
        if (!config) {
            return res.redirect(`/staff/settings?error=${encodeURIComponent('Unsupported provider')}`);
        }
        // Exchange authorization code for tokens
        const tokenResponse = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code: code,
                redirect_uri: config.redirectUri
            })
        });
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error(`❌ [OAUTH] Token exchange failed for ${provider}:`, errorText);
            return res.redirect(`/staff/settings?error=${encodeURIComponent('Token exchange failed')}`);
        }
        const tokens = await tokenResponse.json();
        // Get user profile from provider
        let userProfile = {};
        try {
            if (provider === 'microsoft') {
                const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
                    headers: { 'Authorization': `Bearer ${tokens.access_token}` }
                });
                if (profileResponse.ok) {
                    userProfile = await profileResponse.json();
                }
            }
            else if (provider === 'google') {
                const profileResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
                    headers: { 'Authorization': `Bearer ${tokens.access_token}` }
                });
                if (profileResponse.ok) {
                    userProfile = await profileResponse.json();
                }
            }
            else if (provider === 'linkedin') {
                const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
                    headers: { 'Authorization': `Bearer ${tokens.access_token}` }
                });
                if (profileResponse.ok) {
                    userProfile = await profileResponse.json();
                }
            }
        }
        catch (profileError) {
            console.warn(`⚠️ [OAUTH] Failed to fetch ${provider} profile:`, profileError);
        }
        // Get current user (in production, get from authenticated session)
        const [currentUser] = await db.select({ id: users.id }).from(users).limit(1);
        if (!currentUser) {
            return res.redirect(`/staff/settings?error=${encodeURIComponent('User not found')}`);
        }
        // Calculate expiration time
        const expiresAt = tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null;
        // Store or update connected account
        const accountData = {
            userId: currentUser.id,
            provider: provider,
            providerId: userProfile.id || userProfile.sub || 'unknown',
            providerEmail: userProfile.mail || userProfile.email || userProfile.emailAddress,
            providerDisplayName: userProfile.displayName || userProfile.name || `${userProfile.givenName} ${userProfile.surname}` || 'Unknown',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || null,
            expiresAt,
            scopes: tokens.scope ? tokens.scope.split(' ') : config.scope.split(' '),
            isActive: true,
            lastSyncAt: new Date(),
            metadata: { userProfile, tokens: { token_type: tokens.token_type } }
        };
        // Upsert connected account
        await db
            .insert(connectedAccounts)
            .values(accountData)
            .onConflictDoUpdate({
            target: [connectedAccounts.userId, connectedAccounts.provider],
            set: {
                accessToken: accountData.accessToken,
                refreshToken: accountData.refreshToken,
                expiresAt: accountData.expiresAt,
                scopes: accountData.scopes,
                isActive: true,
                lastSyncAt: new Date(),
                updatedAt: new Date(),
                metadata: accountData.metadata
            }
        });
        console.log(`✅ [OAUTH] ${provider} account connected successfully`);
        res.redirect(`/staff/settings?success=${encodeURIComponent(`${provider} account connected successfully`)}`);
    }
    catch (error) {
        console.error('❌ [OAUTH] Error handling OAuth callback:', error);
        res.redirect(`/staff/settings?error=${encodeURIComponent('Failed to connect account')}`);
    }
});
export default router;
