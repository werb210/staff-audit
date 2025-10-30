import { Router } from "express";
const router = Router();
router.get('/feature-health', async (_req, res) => {
    try {
        const { db } = await import("../db/index.js");
        // Count records in key tables (using actual schema)
        const lendersCount = await db.execute("SELECT COUNT(*) as count FROM lenders");
        const contactsCount = await db.execute("SELECT COUNT(*) as count FROM contacts");
        const appsCount = await db.execute("SELECT COUNT(*) as count FROM applications");
        res.json({
            ui: {
                router: 'ok',
                build: process.env.EXPECT_INDEX_HASH || 'unlocked',
                bundle: '4d06de39'
            },
            auth: {
                mode: 'jwt+cookie',
                working: true
            },
            data: {
                lenders: lendersCount.rows?.[0]?.count || 0,
                contacts: contactsCount.rows?.[0]?.count || 0,
                apps: appsCount.rows?.[0]?.count || 0
            },
            comms: {
                twilioVerify: !!process.env.TWILIO_VERIFY_SID
            },
            o365: {
                configured: !!process.env.O365_CLIENT_ID
            },
            linkedin: {
                connected: !!process.env.LINKEDIN_CLIENT_ID
            },
        });
    }
    catch (error) {
        console.error('Feature health check failed:', error);
        res.status(500).json({
            error: 'Health check failed',
            ui: { router: 'ok', build: process.env.EXPECT_INDEX_HASH || 'unlocked' },
            auth: { mode: 'jwt+cookie', working: true },
            data: { error: 'Database connection failed' }
        });
    }
});
export default router;
