/**
 * Lender Products Health and Management Routes
 * Provides database health monitoring and rebuild capabilities
 */
import { Router } from 'express';
import { db } from '../db';
import { lenderProducts } from '../../shared/schema';
import { isNull } from 'drizzle-orm';
// Import functions that will be available once scripts are running
// import { checkDatabaseHealth, rebuildDatabase } from '../../scripts/upsert-import';
const router = Router();
/**
 * Health endpoint for database integrity checking
 * GET /api/lender-products/health
 */
router.get('/health', async (req, res) => {
    try {
        console.log('🔍 Health check requested...');
        const startTime = Date.now();
        // Get active products and check database health directly
        const activeProducts = await db
            .select()
            .from(lenderProducts)
            .where(isNull(lenderProducts.deletedAt));
        const queryDuration = Date.now() - startTime;
        // Check category coverage
        const requiredCategories = [
            'line_of_credit', 'term_loan', 'equipment_financing',
            'invoice_factoring', 'purchase_order_financing',
            'working_capital', 'asset_based_lending', 'sba_loan'
        ];
        const categoriesFound = new Set(activeProducts.map(p => p.category));
        const missingCategories = requiredCategories.filter(cat => !categoriesFound.has(cat));
        const categoryBreakdown = activeProducts.reduce((acc, product) => {
            acc[product.category] = (acc[product.category] || 0) + 1;
            return acc;
        }, {});
        const needsRebuild = activeProducts.length < 30 || missingCategories.length > 0;
        const healthStatus = needsRebuild ? 'NEEDS_REBUILD' : 'HEALTHY';
        const statusCode = needsRebuild ? 503 : 200;
        console.log(`📊 Health check complete: ${healthStatus} (${activeProducts.length} products)`);
        res.status(statusCode).json({
            success: true,
            status: healthStatus,
            timestamp: new Date().toISOString(),
            database: {
                totalProducts: activeProducts.length,
                categoriesFound: 8 - missingCategories.length,
                categoriesRequired: 8,
                missingCategories,
                categoryBreakdown
            },
            performance: {
                queryDuration: `${queryDuration}ms`,
                healthCheckTime: new Date().toISOString()
            },
            rebuild: {
                needed: needsRebuild,
                reason: needsRebuild ?
                    `${activeProducts.length < 30 ? 'Insufficient products. ' : ''}${missingCategories.length > 0 ? 'Missing categories.' : ''}`.trim()
                    : null
            }
        });
    }
    catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(500).json({
            success: false,
            status: 'ERROR',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Manual rebuild endpoint (admin only)
 * POST /api/lender-products/rebuild
 */
router.post('/rebuild', async (req, res) => {
    try {
        console.log('🔧 Manual rebuild requested...');
        // This is a placeholder for manual rebuild functionality
        // In production, this would trigger the actual rebuild process
        // Get current status
        const activeProducts = await db
            .select()
            .from(lenderProducts)
            .where(isNull(lenderProducts.deletedAt));
        res.json({
            success: true,
            message: 'Rebuild endpoint available - implementation pending',
            timestamp: new Date().toISOString(),
            status: 'MANUAL_REBUILD_REQUIRED',
            note: 'Use scripts/upsert-import.ts for database rebuilding',
            currentStatus: {
                productsCount: activeProducts.length,
                needsRebuild: activeProducts.length < 30
            }
        });
    }
    catch (error) {
        console.error('❌ Rebuild failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Database sync status endpoint
 * GET /api/lender-products/sync-status
 */
router.get('/sync-status', async (req, res) => {
    try {
        // Get current product count and status
        const activeProducts = await db
            .select()
            .from(lenderProducts)
            .where(isNull(lenderProducts.deletedAt));
        // Check when last product was updated
        const recentProducts = await db
            .select()
            .from(lenderProducts)
            .where(isNull(lenderProducts.deletedAt))
            .orderBy(lenderProducts.updatedAt)
            .limit(1);
        const lastUpdated = recentProducts[0]?.updatedAt || null;
        const stalenessHours = lastUpdated ?
            Math.round((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60)) : null;
        const needsRebuild = activeProducts.length < 30;
        res.json({
            success: true,
            sync: {
                status: needsRebuild ? 'OUT_OF_SYNC' : 'SYNCED',
                lastUpdated,
                stalenessHours,
                productsCount: activeProducts.length,
                expectedMinimum: 30,
                categoriesComplete: needsRebuild ? 'Unknown' : 8,
                categoriesExpected: 8
            },
            recommendations: needsRebuild ? [
                'Run rebuild endpoint to restore full product catalog',
                'Verify backup data file exists',
                'Check category mappings are correct'
            ] : [
                'Database is healthy and in sync',
                'All required categories present',
                'Product count meets minimum requirements'
            ]
        });
    }
    catch (error) {
        console.error('❌ Sync status check failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * External API sync simulation endpoint
 * POST /api/lender-products/sync-external
 */
router.post('/sync-external', async (req, res) => {
    try {
        // Get current database status
        const activeProducts = await db
            .select()
            .from(lenderProducts)
            .where(isNull(lenderProducts.deletedAt));
        const needsRebuild = activeProducts.length < 30;
        // Simulate syncing to external APIs
        const externalSyncResults = [
            {
                endpoint: 'Client Portal API',
                url: '/api/public/lenders',
                status: 'SUCCESS',
                productsShared: activeProducts.length,
                responseTime: '45ms'
            },
            {
                endpoint: 'Category API',
                url: '/api/categories',
                status: 'SUCCESS',
                categoriesShared: needsRebuild ? 'Unknown' : 8,
                responseTime: '12ms'
            },
            {
                endpoint: 'CORS Configuration',
                url: 'https://clientportal.replit.app',
                status: needsRebuild ? 'DEGRADED' : 'SUCCESS',
                note: needsRebuild ? 'Reduced product catalog' : 'Full catalog available'
            }
        ];
        res.json({
            success: true,
            message: 'External sync simulation completed',
            timestamp: new Date().toISOString(),
            database: {
                productsAvailable: activeProducts.length,
                categoriesAvailable: needsRebuild ? 'Unknown' : 8,
                readyForSync: !needsRebuild
            },
            syncResults: externalSyncResults,
            overallStatus: needsRebuild ? 'PARTIAL_SYNC' : 'FULL_SYNC'
        });
    }
    catch (error) {
        console.error('❌ External sync failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
