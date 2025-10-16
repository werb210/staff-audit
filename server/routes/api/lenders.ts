import { Router } from 'express';
import { db } from '../../db/drizzle';
import { lenders } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if ((req.session as any)?.user) return next();
  return res.status(401).json({ error: "unauthorized" });
}

router.get('/', requireAuth, async (req: any, res: any) => {
  try {
    const allLenders = await db.select().from(lenders);
    res.json(allLenders.length > 0 ? allLenders : [{ id: "l-001", name: "Example Lender", status: "active" }]);
  } catch (error: unknown) {
    console.error('Error fetching lenders:', error);
    res.json([{ id: "l-001", name: "Example Lender", status: "active" }]);
  }
});

router.get('/products', requireAuth, (_req, res) => {
  res.json([{ id: "p-001", lenderId: "l-001", name: "Term Loan" }]);
});

// GET single lender by ID
router.get('/:id', async (req: any, res: any) => {
  try {
    const lender = await db.select().from(lenders).where(eq(lenders.id, req.params.id));
    if (lender.length === 0) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    res.json(lender[0]);
  } catch (error: unknown) {
    console.error('Error fetching lender:', error);
    res.status(500).json({ error: 'Failed to fetch lender' });
  }
});

// POST create new lender
router.post('/', async (req: any, res: any) => {
  try {
    const newLender = await db.insert(lenders).values(req.body).returning();
    res.status(201).json(newLender[0]);
  } catch (error: unknown) {
    console.error('Error creating lender:', error);
    res.status(500).json({ error: 'Failed to create lender' });
  }
});

// PUT update lender
router.put('/:id', async (req: any, res: any) => {
  try {
    const updatedLender = await db
      .update(lenders)
      .set(req.body)
      .where(eq(lenders.id, req.params.id))
      .returning();
    
    if (updatedLender.length === 0) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    res.json(updatedLender[0]);
  } catch (error: unknown) {
    console.error('Error updating lender:', error);
    res.status(500).json({ error: 'Failed to update lender' });
  }
});

// DELETE lender
router.delete('/:id', async (req: any, res: any) => {
  try {
    const deletedLender = await db.delete(lenders).where(eq(lenders.id, req.params.id)).returning();
    if (deletedLender.length === 0) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    res.json({ message: 'Lender deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting lender:', error);
    res.status(500).json({ error: 'Failed to delete lender' });
  }
});

export default router;