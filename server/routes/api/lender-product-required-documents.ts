import { Router } from 'express';
import { db } from '../../db/drizzle';
import { lenderProducts } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// GET required documents for a product (stored in requiredDocuments JSONB field)
router.get('/:productId', async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const product = await db
      .select({ requiredDocuments: lenderProducts.requiredDocuments })
      .from(lenderProducts)
      .where(eq(lenderProducts.id, productId));
    
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product[0].requiredDocuments || []);
  } catch (error: unknown) {
    console.error('Error fetching required documents:', error);
    res.status(500).json({ error: 'Failed to fetch required documents' });
  }
});

// POST update required documents for a product
router.post('/:productId', async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const { selected } = req.body;
    
    const updated = await db
      .update(lenderProducts)
      .set({ requiredDocuments: selected })
      .where(eq(lenderProducts.id, productId))
      .returning();
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, requiredDocuments: updated[0].requiredDocuments });
  } catch (error: unknown) {
    console.error('Error updating required documents:', error);
    res.status(500).json({ error: 'Failed to update required documents' });
  }
});

export default router;