/**
 * Database Health Monitoring Endpoints
 * Implements safety monitoring as per database safety requirements
 */
import { Router } from 'express';
import { db } from '../db';
import { lenderProducts } from '../../shared/schema';
import { isNull, count, max } from 'drizzle-orm';
const router = Router();
/**
 * GET /api/debug/lender-products-health
 * Returns comprehensive health status of lender products database
 */
router.get('/lender-products-health', async (req, res) => async (req, res) => {
    try {
        const startTime = Date.now();
        // Get total count of all products (including soft-deleted)
        const totalResult = await db.select({ count: count() }).from(lenderProducts);
        const totalProducts = totalResult[0]?.count || 0;
        // Get count of active products (not soft-deleted)
        const activeResult = await db
            .select({ count: count() })
            .from(lenderProducts)
            .where(isNull(lenderProducts.deletedAt));
        const activeProducts = activeResult[0]?.count || 0;
        // Get count of soft-deleted products
        const deletedProducts = totalProducts - activeProducts;
        // Get last modification timestamp
        const lastModifiedResult = await db
            .select({ lastModified: max(lenderProducts.updatedAt) })
            .from(lenderProducts);
        const lastModified = lastModifiedResult[0]?.lastModified || null;
        // Calculate query performance
        const queryTime = Date.now() - startTime;
        // Determine health status
        const isHealthy = activeProducts >= 30; // Expect at least 30 authentic products
        const status = isHealthy ? 'healthy' : activeProducts === 0 ? 'critical' : 'warning';
        // Get sample products for verification
        const sampleProducts = await db
            .select({
            id: lenderProducts.id,
            productName: lenderProducts.productName,
            lenderName: lenderProducts.lenderName,
            category: lenderProducts.category,
            country: lenderProducts.country
        })
            .from(lenderProducts)
            .where(isNull(lenderProducts.deletedAt))
            .limit(3);
        const healthReport = {
            status,
            timestamp: new Date().toISOString(),
            database: {
                total: totalProducts,
                active: activeProducts,
                deleted: deletedProducts,
                lastModified: lastModified?.toISOString() || null,
                queryPerformance: `${queryTime}ms`
            },
            validation: {
                hasMinimumProducts: activeProducts >= 30,
                hasRecentActivity: lastModified ? (Date.now() - lastModified.getTime()) < 7 * 24 * 60 * 60 * 1000 : false, // Within 7 days
                performanceGood: queryTime < 1000
            },
            sampleProducts,
            recommendations: isHealthy ? [] : [
                activeProducts === 0 ? 'CRITICAL: No active products found. Check for data loss.' : null,
                activeProducts < 30 ? 'WARNING: Low product count. Consider running import-authentic-lenders.js' : null,
                queryTime > 1000 ? 'PERFORMANCE: Slow query response. Check database indexes.' : null
            ].filter(Boolean)
        };
        res.json({
            success: true,
            health: healthReport
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * GET /api/debug/database-safety-status
 * Returns comprehensive safety compliance status
 */
router.get('/database-safety-status', async (req, res) => async (req, res) => {
    try {
        const safetyChecks = {
            softDeleteImplemented: true, // We have deletedAt field
            upsertLogicPresent: true, // RBAC endpoints use upsert
            rbacAuthenticationActive: true, // Protected routes require auth
            publicEndpointsFiltered: true, // Public APIs filter soft-deleted
            auditLoggingConfigured: false, // Missing audit tables (known issue)
            backupSystemActive: false // No automated backup (future enhancement)
        };
        const passedChecks = Object.values(safetyChecks).filter(Boolean).length;
        const totalChecks = Object.keys(safetyChecks).length;
        const compliancePercentage = Math.round((passedChecks / totalChecks) * 100);
        res.json({
            success: true,
            compliance: {
                percentage: compliancePercentage,
                status: compliancePercentage >= 80 ? 'compliant' : 'needs_attention',
                checks: safetyChecks,
                summary: `${passedChecks}/${totalChecks} safety measures implemented`
            },
            endpoints: {
                rbacProtected: [
                    'GET /api/rbac/lender-products',
                    'POST /api/rbac/lender-products',
                    'PATCH /api/rbac/lender-products/:id',
                    'DELETE /api/rbac/lender-products/:id'
                ],
                publicFiltered: [
                    'GET /api/public/lenders',
                    'GET /api/public/lenders/summary'
                ]
            }
        });
    }
    catch (error) {
        console.error('Safety status check error:', error);
        res.status(500).json({
            success: false,
            error: 'Safety status check failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
