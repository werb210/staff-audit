import { Router } from 'express';
import { getLenderProducts } from './lenderProducts';

const router = Router();

// ✅ Public endpoint, no authentication middleware
router.get('/lender-products', getLenderProducts);

export default router;