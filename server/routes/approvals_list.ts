import { Router } from 'express';
import { db } from '../db/drizzle';
import { approvalRequests } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { TenantRequest } from '../middleware/tenant';

const router = Router();

// List approval requests with filtering
router.get('/approvals', async (req: TenantRequest, res) => {
  try {
    const tenant = req.tenant || 'bf';
    const { contactId, status } = req.query as any;
    
    let conditions = [eq(approvalRequests.tenant, tenant)];
    
    if (contactId) {
      conditions.push(eq(approvalRequests.contactId, String(contactId)));
    }
    
    if (status) {
      conditions.push(eq(approvalRequests.status, String(status)));
    }
    
    const items = await db.select()
      .from(approvalRequests)
      .where(and(...conditions))
      .orderBy(desc(approvalRequests.updatedAt));
      
    res.json({ ok: true, items });
  } catch (error: unknown) {
    console.error('Failed to fetch approval requests:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'internal_error',
      message: 'Failed to fetch approval requests'
    });
  }
});

// Get single approval request by ID
router.get('/approvals/:id', async (req: TenantRequest, res) => {
  try {
    const tenant = req.tenant || 'bf';
    const { id } = req.params;
    
    const [item] = await db.select()
      .from(approvalRequests)
      .where(and(
        eq(approvalRequests.id, id),
        eq(approvalRequests.tenant, tenant)
      ))
      .limit(1);
      
    if (!item) {
      return res.status(404).json({ 
        ok: false, 
        error: 'not_found',
        message: 'Approval request not found'
      });
    }
    
    res.json({ ok: true, item });
  } catch (error: unknown) {
    console.error('Failed to fetch approval request:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'internal_error',
      message: 'Failed to fetch approval request'
    });
  }
});

export default router;