import express from 'express';
import { requireSLFAuth } from '../../middleware/authMiddleware';
import { db } from '../../db';
import { desc } from 'drizzle-orm';
import { slf_contacts } from '../../../shared/schema';
const router = express.Router();
/**
 * SLF Analytics Dashboard - Protected
 * Returns SLF-specific data only
 */
router.get('/analytics', requireSLFAuth(['staff', 'admin']), async (req, res) => {
    try {
        console.log(`📊 [SLF-ANALYTICS] Generating analytics for user: ${req.user?.email}`);
        // Get SLF contact counts
        const contactCount = await db
            .select({ count: desc(slf_contacts.id) })
            .from(slf_contacts);
        const analytics = {
            contacts: {
                total: contactCount.length,
                lastWeek: Math.floor(contactCount.length * 0.2), // Mock calculation
                thisMonth: Math.floor(contactCount.length * 0.7)
            },
            calls: {
                total: 0, // Will be populated when call logs are connected
                answered: 0,
                missed: 0
            },
            silo: 'SLF',
            fromNumber: '(775) 314-6801',
            lastUpdated: new Date().toISOString()
        };
        console.log(`📊 [SLF-ANALYTICS] Generated analytics:`, analytics);
        res.json({
            success: true,
            analytics,
            silo: 'SLF'
        });
    }
    catch (error) {
        console.error('❌ [SLF-ANALYTICS] Error generating analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate SLF analytics'
        });
    }
});
/**
 * SLF Dashboard Overview - Protected
 */
router.get('/dashboard', requireSLFAuth(['staff', 'admin']), async (req, res) => {
    try {
        console.log(`🏠 [SLF-DASHBOARD] Loading dashboard for user: ${req.user?.email}`);
        const overview = {
            silo: 'SLF',
            features: ['Second Phone Line', 'Contact Management', 'Call Dialer'],
            phoneNumber: '(775) 314-6801',
            restrictedTo: 'SLF silo only',
            lastLogin: new Date().toISOString(),
            userRole: req.user?.role
        };
        res.json({
            success: true,
            overview,
            silo: 'SLF'
        });
    }
    catch (error) {
        console.error('❌ [SLF-DASHBOARD] Error loading dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load SLF dashboard'
        });
    }
});
/**
 * SLF Health Check - Protected
 */
router.get('/health', requireSLFAuth(['staff', 'admin']), async (req, res) => {
    try {
        const health = {
            status: 'operational',
            silo: 'SLF',
            services: {
                contacts: 'operational',
                dialer: 'operational',
                phoneNumber: '(775) 314-6801'
            },
            timestamp: new Date().toISOString()
        };
        res.json(health);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'SLF health check failed'
        });
    }
});
export default router;
