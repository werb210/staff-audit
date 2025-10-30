import { Router } from 'express';
import { db } from '../db/connection';
import { applications } from '../schema';
import { desc } from 'drizzle-orm';

const router = Router();

router.get('/cards', async (_req, res) => {
  const rows = await db.select({
    id: applications.id,
    stage: applications.stage,
    businessName: applications.business_name,
    amount: applications.amount,
  }).from(applications).orderBy(desc(applications.createdAt));

  res.json(rows);
});

export default router;
