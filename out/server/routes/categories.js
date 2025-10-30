/**
 * Categories API Routes
 * Dynamic category management for lender products
 */
import { Router } from 'express';
import { db } from '../db';
import { lenderProducts } from '../../shared/schema';
import { sql } from 'drizzle-orm';
const router = Router();
/**
 * GET /api/categories
 * Returns all unique categories currently in use in the database
 */
router.get('/', async (req, res) => {
    try {
        console.log('🏷️  Fetching dynamic categories from database...');
        // Get unique categories from active lender products
        const categoriesResult = await db
            .select({
            category: lenderProducts.category
        })
            .from(lenderProducts)
            .where(sql `${lenderProducts.deletedAt} IS NULL`)
            .groupBy(lenderProducts.category)
            .orderBy(lenderProducts.category);
        const categories = categoriesResult.map(row => row.category);
        console.log(`📋 Found ${categories.length} unique categories:`, categories);
        res.json({
            success: true,
            categories,
            count: categories.length,
            message: 'Dynamic categories retrieved successfully'
        });
    }
    catch (error) {
        console.error('❌ Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * GET /api/categories/counts
 * Returns categories with product counts for analytics
 */
router.get('/counts', async (req, res) => {
    try {
        console.log('📊 Fetching category distribution...');
        const categoryStats = await db
            .select({
            category: lenderProducts.category,
            count: sql `count(*)::int`
        })
            .from(lenderProducts)
            .where(sql `${lenderProducts.deletedAt} IS NULL`)
            .groupBy(lenderProducts.category)
            .orderBy(sql `count(*) desc`);
        console.log(`📈 Category distribution:`, categoryStats);
        res.json({
            success: true,
            categories: categoryStats,
            total: categoryStats.reduce((sum, cat) => sum + cat.count, 0)
        });
    }
    catch (error) {
        console.error('❌ Error fetching category counts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch category counts'
        });
    }
});
export default router;
