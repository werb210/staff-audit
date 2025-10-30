import { Router } from 'express';
import { db } from '../db';
import { connectedAccounts, users } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
const router = Router();
// GET /api/connected-accounts - Get user's connected accounts
router.get('/', async (req, res) => {
    try {
        console.log('🔗 [CONNECTED-ACCOUNTS] Fetching connected accounts...');
        // Get first available user for development - replace with actual auth
        const [currentUser] = await db.select({ id: users.id }).from(users).limit(1);
        if (!currentUser) {
            return res.status(404).json({ success: false, error: 'No users found' });
        }
        // Get user's connected accounts
        const accounts = await db
            .select({
            id: connectedAccounts.id,
            provider: connectedAccounts.provider,
            providerEmail: connectedAccounts.providerEmail,
            providerDisplayName: connectedAccounts.providerDisplayName,
            scopes: connectedAccounts.scopes,
            isActive: connectedAccounts.isActive,
            lastSyncAt: connectedAccounts.lastSyncAt,
            expiresAt: connectedAccounts.expiresAt,
            createdAt: connectedAccounts.createdAt
        })
            .from(connectedAccounts)
            .where(eq(connectedAccounts.userId, currentUser.id));
        // Return accounts with connection status
        const accountsWithStatus = accounts.map(account => ({
            ...account,
            isExpired: account.expiresAt ? new Date(account.expiresAt) < new Date() : false,
            isConnected: account.isActive && (!account.expiresAt || new Date(account.expiresAt) > new Date())
        }));
        res.json({
            success: true,
            data: accountsWithStatus
        });
    }
    catch (error) {
        console.error('❌ [CONNECTED-ACCOUNTS] Error fetching accounts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch connected accounts',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// DELETE /api/connected-accounts/:provider - Disconnect an account
router.delete('/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        console.log(`🔗 [CONNECTED-ACCOUNTS] Disconnecting ${provider} account...`);
        // Get first available user for development
        const [currentUser] = await db.select({ id: users.id }).from(users).limit(1);
        if (!currentUser) {
            return res.status(404).json({ success: false, error: 'No users found' });
        }
        // Delete the connected account
        const result = await db
            .delete(connectedAccounts)
            .where(and(eq(connectedAccounts.userId, currentUser.id), eq(connectedAccounts.provider, provider)))
            .returning();
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No ${provider} account found to disconnect`
            });
        }
        console.log(`✅ [CONNECTED-ACCOUNTS] ${provider} account disconnected successfully`);
        res.json({
            success: true,
            message: `${provider} account disconnected successfully`
        });
    }
    catch (error) {
        console.error('❌ [CONNECTED-ACCOUNTS] Error disconnecting account:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disconnect account',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// GET /api/connected-accounts/status - Get overall connection status
router.get('/status', async (req, res) => {
    try {
        console.log('🔗 [CONNECTED-ACCOUNTS] Fetching connection status...');
        // Get first available user for development
        const [currentUser] = await db.select({ id: users.id }).from(users).limit(1);
        if (!currentUser) {
            return res.json({
                success: true,
                data: {
                    microsoft: { connected: false, hasExpired: false },
                    google: { connected: false, hasExpired: false },
                    linkedin: { connected: false, hasExpired: false }
                }
            });
        }
        // Get user's connected accounts
        const accounts = await db
            .select({
            provider: connectedAccounts.provider,
            isActive: connectedAccounts.isActive,
            expiresAt: connectedAccounts.expiresAt
        })
            .from(connectedAccounts)
            .where(eq(connectedAccounts.userId, currentUser.id));
        // Build status object
        const status = {
            microsoft: { connected: false, hasExpired: false },
            google: { connected: false, hasExpired: false },
            linkedin: { connected: false, hasExpired: false }
        };
        accounts.forEach(account => {
            const isExpired = account.expiresAt ? new Date(account.expiresAt) < new Date() : false;
            status[account.provider] = {
                connected: account.isActive && !isExpired,
                hasExpired: isExpired
            };
        });
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('❌ [CONNECTED-ACCOUNTS] Error fetching status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch connection status',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
