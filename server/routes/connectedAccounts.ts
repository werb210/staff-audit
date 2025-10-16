import { Router } from 'express';
import { tokenService } from '../services/tokenService';

const router = Router();

// Get connected accounts status for current user
router.get('/connected-accounts', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all tokens for the user
    const tokens = await tokenService.getUserTokens(userId);
    
    // Build response with connection status for each provider
    const providers = ['microsoft', 'google', 'linkedin'];
    const connectedAccounts: Record<string, any> = {};

    for (const provider of providers) {
      const token = tokens.find(t => t.provider === provider);
      connectedAccounts[provider] = {
        connected: !!token && !tokenService.isTokenExpired(token),
        connectedAt: token?.createdAt?.toISOString(),
        provider: provider
      };
    }

    res.json(connectedAccounts);
  } catch (error: unknown) {
    console.error('Error fetching connected accounts:', error);
    res.status(500).json({ error: 'Failed to fetch connected accounts' });
  }
});

// Connect to a provider (initiate OAuth flow)
router.post('/connect/:provider', async (req: any, res: any) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supportedProviders = ['microsoft', 'google', 'linkedin'];
    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    // Generate OAuth redirect URL based on provider
    let redirectUrl: string;
    
    switch (provider) {
      case 'microsoft':
        redirectUrl = `/api/auth/microsoft?userId=${userId}`;
        break;
      case 'google':
        redirectUrl = `/api/auth/google?userId=${userId}`;
        break;
      case 'linkedin':
        redirectUrl = `/api/auth/linkedin?userId=${userId}`;
        break;
      default:
        throw new Error('Unsupported provider');
    }

    res.json({ 
      success: true, 
      redirectUrl,
      provider 
    });
  } catch (error: unknown) {
    console.error('Error initiating OAuth connection:', error);
    res.status(500).json({ error: 'Failed to initiate connection' });
  }
});

// Disconnect from a provider
router.delete('/disconnect/:provider', async (req: any, res: any) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supportedProviders = ['microsoft', 'google', 'linkedin'];
    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    // Delete the token for this provider
    const deleted = await tokenService.deleteToken(userId, provider);
    
    if (!deleted) {
      return res.status(404).json({ error: 'No connection found for this provider' });
    }

    res.json({ 
      success: true, 
      message: `Successfully disconnected from ${provider}` 
    });
  } catch (error: unknown) {
    console.error('Error disconnecting from provider:', error);
    res.status(500).json({ error: 'Failed to disconnect from provider' });
  }
});

// OAuth callback handler for storing tokens
router.post('/oauth/callback', async (req: any, res: any) => {
  try {
    const { 
      userId, 
      provider, 
      accessToken, 
      refreshToken, 
      expiresIn, 
      scope 
    } = req.body;

    if (!userId || !provider || !accessToken) {
      return res.status(400).json({ error: 'Missing required OAuth data' });
    }

    // Calculate expiration date
    let expiresAt: Date | undefined;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + parseInt(expiresIn) * 1000);
    }

    // Save the token
    const savedToken = await tokenService.saveToken(
      userId,
      provider,
      accessToken,
      refreshToken,
      expiresAt,
      scope
    );

    res.json({ 
      success: true, 
      message: 'OAuth token saved successfully',
      tokenId: savedToken.id
    });
  } catch (error: unknown) {
    console.error('Error saving OAuth token:', error);
    res.status(500).json({ error: 'Failed to save OAuth token' });
  }
});

export default router;