/**
 * SECURITY STATUS API ROUTES
 * Provides security test runner access via API for dashboard integration
 */
import { Router } from 'express';
// Note: Security test runner available via CLI: node shared/security/runSecurityTests.cjs
const router = Router();
// Security status endpoints - CLI based execution
router.get('/security-status', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not available in production' });
    }
    try {
        // Return security configuration status
        const status = {
            jwtConfigured: !!process.env.JWT_SECRET,
            jwtLength: process.env.JWT_SECRET?.length || 0,
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            securityTestsAvailable: true,
            testCommand: 'node shared/security/runSecurityTests.cjs --env=dev'
        };
        res.json({
            success: true,
            securityStatus: status
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
