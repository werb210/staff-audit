import express from 'express';
import { db } from '../db';
import { silos } from '../../shared/schema';
import { eq, asc } from 'drizzle-orm';
const router = express.Router();
// Get all active silos
router.get('/', async (req, res) => {
    try {
        console.log('📋 [SILOS] Fetching silo configurations');
        const result = await db.select({
            id: silos.id,
            code: silos.code,
            name: silos.name,
            color: silos.color,
            logoUrl: silos.logoUrl,
            isActive: silos.isActive,
            createdAt: silos.createdAt
        })
            .from(silos)
            .where(eq(silos.isActive, true))
            .orderBy(asc(silos.code));
        console.log(`📋 [SILOS] Found ${result.length} active silos`);
        res.json({
            success: true,
            silos: result
        });
    }
    catch (error) {
        console.error('❌ [SILOS] Error fetching silos:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch silo configurations'
        });
    }
});
export default router;
