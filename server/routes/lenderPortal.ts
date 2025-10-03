import { Router } from 'express';
import { authMiddleware } from '../middleware/authJwt';
import { db } from '../db';
import { lenderProducts, lenders, users } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Middleware to ensure user is a lender
const requireLenderAuth = async (req: any, res: any, next: any) => {
  try {
    // First check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has lender role
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user || user.role !== 'lender') {
      return res.status(403).json({ error: 'Lender access required' });
    }

    // Check if user has an associated lender record
    const [lender] = await db
      .select()
      .from(lenders)
      .where(eq(lenders.id, user.lenderId || ''))
      .limit(1);

    if (!lender) {
      return res.status(403).json({ error: 'No lender account found' });
    }

    req.lender = lender;
    next();
  } catch (error: unknown) {
    console.error('Lender auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Apply authentication middleware to all lender portal routes
router.use(authMiddleware);
router.use(requireLenderAuth);

// Get lender's products
router.get('/products', async (req: any, res: any) => {
  try {
    const lenderId = req.lender?.id;

    const products = await db
      .select({
        id: lenderProducts.id,
        name: lenderProducts.name,
        category: lenderProducts.category,
        minAmount: lenderProducts.minAmount,
        maxAmount: lenderProducts.maxAmount,
        interestRateMin: lenderProducts.interestRateMin,
        interestRateMax: lenderProducts.interestRateMax,
        termMin: lenderProducts.termMin,
        termMax: lenderProducts.termMax,
        isActive: lenderProducts.isActive,
        applicationCount: lenderProducts.applicationCount,
        approvalRate: lenderProducts.approvalRate,
        avgProcessingTime: lenderProducts.avgProcessingTime,
        createdAt: lenderProducts.createdAt,
        updatedAt: lenderProducts.updatedAt
      })
      .from(lenderProducts)
      .where(eq(lenderProducts.lenderId, lenderId))
      .orderBy(lenderProducts.name);

    res.json({ 
      products,
      lender: {
        id: req.lender.id,
        name: req.lender.name,
        type: req.lender.type
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching lender products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get lender dashboard metrics
router.get('/dashboard', async (req: any, res: any) => {
  try {
    const lenderId = req.lender?.id;

    // Get product count
    const [productCount] = await db
      .select({ count: db.$count() })
      .from(lenderProducts)
      .where(and(
        eq(lenderProducts.lenderId, lenderId),
        eq(lenderProducts.isActive, true)
      ));

    // Get total applications across all products
    const products = await db
      .select({
        applicationCount: lenderProducts.applicationCount,
        approvalRate: lenderProducts.approvalRate
      })
      .from(lenderProducts)
      .where(eq(lenderProducts.lenderId, lenderId));

    const totalApplications = products.reduce((sum, p) => sum + (p.applicationCount || 0), 0);
    const avgApprovalRate = products.length > 0 
      ? products.reduce((sum, p) => sum + (p.approvalRate || 0), 0) / products.length 
      : 0;

    res.json({
      lender: {
        id: req.lender.id,
        name: req.lender.name,
        type: req.lender.type
      },
      metrics: {
        activeProducts: productCount.count,
        totalApplications,
        avgApprovalRate: Math.round(avgApprovalRate * 100) / 100,
        status: req.lender.isActive ? 'active' : 'inactive'
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching lender dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Update product settings
router.patch('/products/:productId', async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const lenderId = req.lender?.id;
    const updates = req.body;

    // Verify product belongs to this lender
    const [existingProduct] = await db
      .select()
      .from(lenderProducts)
      .where(and(
        eq(lenderProducts.id, productId),
        eq(lenderProducts.lenderId, lenderId)
      ))
      .limit(1);

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update the product
    const [updatedProduct] = await db
      .update(lenderProducts)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(lenderProducts.id, productId))
      .returning();

    res.json({ 
      success: true, 
      product: updatedProduct 
    });
  } catch (error: unknown) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Get lender profile
router.get('/profile', async (req: any, res: any) => {
  try {
    const lender = req.lender;
    
    res.json({
      id: lender.id,
      name: lender.name,
      type: lender.type,
      description: lender.description,
      website: lender.website,
      phone: lender.phone,
      email: lender.email,
      address: lender.address,
      isActive: lender.isActive,
      verificationStatus: lender.verificationStatus,
      createdAt: lender.createdAt,
      updatedAt: lender.updatedAt
    });
  } catch (error: unknown) {
    console.error('Error fetching lender profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;