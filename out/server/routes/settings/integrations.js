import express from 'express';
import { db } from '../../db';
import { oauthTokens } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
const router = express.Router();
// Get token status for all OAuth providers
router.get('/status', async (req, res) => {
    try {
        // Always provide mock status for development/testing
        const mockStatus = {
            google: false,
            microsoft: false,
            linkedin: false
        };
        return res.json(mockStatus);
        // Production code (currently commented out for testing)
        /*
        const userId = (req as any).user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        */
        // Query OAuth tokens for this user
        const tokens = await db
            .select({ provider: oauthTokens.provider })
            .from(oauthTokens)
            .where(eq(oauthTokens.userId, userId));
        // Create status object for each provider
        const providers = ['google', 'microsoft', 'linkedin'];
        const status = Object.fromEntries(providers.map(provider => [
            provider,
            tokens.some(token => token.provider === provider)
        ]));
        res.json(status);
    }
    catch (err) {
        console.error('Get integration status error:', err);
        res.status(500).json({ error: 'Failed to get integration status' });
    }
});
// Disconnect OAuth provider
router.post('/:provider/disconnect', async (req, res) => {
    try {
        const { provider } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        await db
            .delete(oauthTokens)
            .where(eq(oauthTokens.userId, userId))
            .where(eq(oauthTokens.provider, provider));
        res.json({ success: true });
    }
    catch (err) {
        console.error('Disconnect integration error:', err);
        res.status(500).json({ error: 'Failed to disconnect integration' });
    }
});
export default router;
