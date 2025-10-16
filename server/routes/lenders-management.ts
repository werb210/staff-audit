import express from 'express';
import { db } from '../db';
import { lenders, insertLenderSchema } from '@shared/schema';
import { eq, like, or, and } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();

// Utility function to validate UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/lenders-management - Get all lenders with search/filter
router.get('/', async (req: any, res: any) => {
  try {
    console.log('🔍 GET /api/lenders-management - Fetching lenders');
    
    const { search, active, page = '1', limit = '50' } = req.query;
    
    let query = db.select().from(lenders);
    
    // Apply filters
    const conditions = [];
    
    if (search && typeof search === 'string') {
      conditions.push(
        or(
          like(lenders.name, `%${search}%`),
          like(lenders.contactName, `%${search}%`),
          like(lenders.contactEmail, `%${search}%`),
          like(lenders.companyBio, `%${search}%`)
        )
      );
    }
    
    if (active !== undefined) {
      conditions.push(eq(lenders.isActive, active === 'true'));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;
    
    const results = await query.limit(limitNum).offset(offset);
    
    // Get total count for pagination
    const totalQuery = db.select({ count: lenders.id }).from(lenders);
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }
    const totalCount = await totalQuery;
    
    console.log(`📋 Found ${results.length} lenders (total: ${totalCount.length})`);
    
    res.json({
      lenders: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount.length,
        pages: Math.ceil(totalCount.length / limitNum)
      }
    });
  } catch (error: unknown) {
    console.error('❌ Error fetching lenders:', error);
    res.status(500).json({ error: 'Failed to fetch lenders' });
  }
});

// GET /api/lenders-management/:id - Get single lender by ID
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid lender ID format' });
    }
    
    console.log(`🔍 GET /api/lenders-management/${id} - Fetching lender details`);
    
    const [lender] = await db
      .select()
      .from(lenders)
      .where(eq(lenders.id, id));
    
    if (!lender) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    console.log(`✅ Found lender: ${lender.name}`);
    res.json(lender);
  } catch (error: unknown) {
    console.error('❌ Error fetching lender:', error);
    res.status(500).json({ error: 'Failed to fetch lender' });
  }
});

// POST /api/lenders-management - Create new lender
router.post('/', async (req: any, res: any) => {
  try {
    console.log('🔄 POST /api/lenders-management - Creating new lender');
    
    // Validate request body
    const validationResult = insertLenderSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('❌ Validation failed:', validationResult.error.issues);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.issues 
      });
    }
    
    const lenderData = validationResult.data;
    
    // Check for duplicate name
    const existingLender = await db
      .select()
      .from(lenders)
      .where(eq(lenders.name, lenderData.name));
    
    if (existingLender.length > 0) {
      return res.status(409).json({ error: 'Lender with this name already exists' });
    }
    
    // Create new lender
    const [newLender] = await db
      .insert(lenders)
      .values({
        ...lenderData,
        updatedAt: new Date()
      })
      .returning();
    
    console.log(`✅ Created new lender: ${newLender.name} (ID: ${newLender.id})`);
    res.status(201).json(newLender);
  } catch (error: unknown) {
    console.error('❌ Error creating lender:', error);
    res.status(500).json({ error: 'Failed to create lender' });
  }
});

// PATCH /api/lenders-management/:id - Update lender
router.patch('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid lender ID format' });
    }
    
    console.log(`🔄 PATCH /api/lenders-management/${id} - Updating lender`);
    
    // Validate request body (partial update)
    const updateSchema = insertLenderSchema.partial();
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('❌ Validation failed:', validationResult.error.issues);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.issues 
      });
    }
    
    const updates = validationResult.data;
    
    // Check if lender exists
    const [existingLender] = await db
      .select()
      .from(lenders)
      .where(eq(lenders.id, id));
    
    if (!existingLender) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== existingLender.name) {
      const duplicateLender = await db
        .select()
        .from(lenders)
        .where(and(
          eq(lenders.name, updates.name),
          eq(lenders.id, id)
        ));
      
      if (duplicateLender.length > 0) {
        return res.status(409).json({ error: 'Lender with this name already exists' });
      }
    }
    
    // Update lender
    const [updatedLender] = await db
      .update(lenders)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(lenders.id, id))
      .returning();
    
    console.log(`✅ Updated lender: ${updatedLender.name}`);
    res.json(updatedLender);
  } catch (error: unknown) {
    console.error('❌ Error updating lender:', error);
    res.status(500).json({ error: 'Failed to update lender' });
  }
});

// DELETE /api/lenders-management/:id - Soft delete lender (deactivate)
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid lender ID format' });
    }
    
    console.log(`🗑️ DELETE /api/lenders-management/${id} - Deactivating lender`);
    
    // Check if lender exists
    const [existingLender] = await db
      .select()
      .from(lenders)
      .where(eq(lenders.id, id));
    
    if (!existingLender) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    // Soft delete (deactivate)
    const [deactivatedLender] = await db
      .update(lenders)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(lenders.id, id))
      .returning();
    
    console.log(`✅ Deactivated lender: ${deactivatedLender.name}`);
    res.json({ message: 'Lender deactivated successfully', lender: deactivatedLender });
  } catch (error: unknown) {
    console.error('❌ Error deactivating lender:', error);
    res.status(500).json({ error: 'Failed to deactivate lender' });
  }
});

// POST /api/lenders-management/:id/activate - Reactivate lender
router.post('/:id/activate', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid lender ID format' });
    }
    
    console.log(`🔄 POST /api/lenders-management/${id}/activate - Reactivating lender`);
    
    // Check if lender exists
    const [existingLender] = await db
      .select()
      .from(lenders)
      .where(eq(lenders.id, id));
    
    if (!existingLender) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    // Reactivate
    const [activatedLender] = await db
      .update(lenders)
      .set({
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(lenders.id, id))
      .returning();
    
    console.log(`✅ Reactivated lender: ${activatedLender.name}`);
    res.json({ message: 'Lender reactivated successfully', lender: activatedLender });
  } catch (error: unknown) {
    console.error('❌ Error reactivating lender:', error);
    res.status(500).json({ error: 'Failed to reactivate lender' });
  }
});

// GET /api/lenders-management/stats - Get lender statistics
router.get('/stats', async (req: any, res: any) => {
  try {
    console.log('📊 GET /api/lenders-management/stats - Fetching lender statistics');
    
    const [totalLenders] = await db.select({ count: lenders.id }).from(lenders);
    const [activeLenders] = await db.select({ count: lenders.id }).from(lenders).where(eq(lenders.isActive, true));
    const [inactiveLenders] = await db.select({ count: lenders.id }).from(lenders).where(eq(lenders.isActive, false));
    
    const stats = {
      total: totalLenders?.count || 0,
      active: activeLenders?.count || 0,
      inactive: inactiveLenders?.count || 0
    };
    
    console.log('📊 Lender stats:', stats);
    res.json(stats);
  } catch (error: unknown) {
    console.error('❌ Error fetching lender stats:', error);
    res.status(500).json({ error: 'Failed to fetch lender statistics' });
  }
});

export default router;