import { Router } from 'express';
import { z } from 'zod';
import { staffOnly, authenticatedRoute } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  minAmount: z.number().positive('Minimum amount must be positive'),
  maxAmount: z.number().positive('Maximum amount must be positive'),
  minRate: z.number().min(0, 'Minimum rate cannot be negative'),
  maxRate: z.number().min(0, 'Maximum rate cannot be negative'),
  minTermMonths: z.number().int().positive('Minimum term must be positive'),
  maxTermMonths: z.number().int().positive('Maximum term must be positive'),
  requirements: z.array(z.string()).default([]),
  formSchema: z.record(z.any()).default({})
});

// GET /products - List products with tenant isolation
router.get('/', authenticatedRoute, asyncHandler(async (req, res) => {
  // TODO: Query database with tenant isolation
  // WHERE tenant_id = req.tenantId AND is_active = true
  
  res.json([]);
}));

// POST /products - Create new product (staff only)
router.post('/', staffOnly, asyncHandler(async (req, res) => {
  const productData = createProductSchema.parse(req.body);
  
  // TODO: Insert into database with tenant isolation
  const product = {
    id: Math.random().toString(36).substr(2, 9),
    tenantId: req.tenantId,
    ...productData,
    isActive: true,
    createdAt: new Date()
  };

  res.status(201).json(product);
}));

// GET /products/:id - Get specific product
router.get('/:id', authenticatedRoute, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // TODO: Query database with tenant isolation
  // WHERE id = :id AND tenant_id = req.tenantId
  
  res.json({ 
    id,
    tenantId: req.tenantId,
    message: 'Product details'
  });
}));

export { router as productRoutes };