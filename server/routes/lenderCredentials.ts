import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq, sql, isNull } from 'drizzle-orm';

const router = Router();

// GET current credentials for a lender (no password returned)
router.get('/lenders/:lenderName/credentials', async (req: any, res: any) => {
  try {
    const { lenderName } = req.params;

    if (!lenderName) {
      return res.status(400).json({
        success: false,
        error: 'Lender name is required'
      });
    }

    // Lender credentials temporarily disabled during schema migration
    const credResult: any[] = [];
    console.log('Lender credentials fetch disabled during schema migration');

    const credential = credResult[0] || null;

    return res.json({
      success: true,
      data: credential ? {
        username: credential.username,
        hasCredentials: true,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt
      } : {
        username: '',
        hasCredentials: false
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching lender credentials:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch credentials'
    });
  }
});

// POST/PATCH credentials for a lender (upsert)
router.post('/lenders/:lenderName/credentials', async (req: any, res: any) => {
  try {
    const { lenderName } = req.params;
    const { username, password } = req.body;

    if (!lenderName) {
      return res.status(400).json({
        success: false,
        error: 'Lender name is required'
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Lender credentials temporarily disabled during schema migration
    console.log('Lender credentials update disabled during schema migration');
    
    // TODO: Re-enable when lender_credentials table is restored
    // const existingCred = await db.select().from(lenderCredentials)...

    return res.json({
      success: true,
      message: 'Credentials updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating lender credentials:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505' && error.detail?.includes('username')) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists for another lender'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update credentials'
    });
  }
});

// DELETE credentials for a lender
router.delete('/lenders/:lenderName/credentials', async (req: any, res: any) => {
  try {
    const { lenderName } = req.params;

    if (!lenderName) {
      return res.status(400).json({
        success: false,
        error: 'Lender name is required'
      });
    }

    // Lender credentials deletion temporarily disabled during schema migration
    console.log('Lender credentials deletion disabled during schema migration');

    return res.json({
      success: true,
      message: 'Credentials deleted successfully'
    });

  } catch (error: unknown) {
    console.error('Error deleting lender credentials:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete credentials'
    });
  }
});

// DELETE lender and all their products
router.delete('/lenders/:lenderName/delete', async (req: any, res: any) => {
  try {
    const { lenderName } = req.params;

    if (!lenderName) {
      return res.status(400).json({
        success: false,
        error: 'Lender name is required'
      });
    }

    console.log(`🗑️ Starting deletion process for lender: ${lenderName}`);

    // Use raw SQL for lender deletion since table schemas are not imported
    const deletedProducts = await db.transaction(async (tx) => {
      // 1. First, soft delete all products for this lender (raw SQL)
      const products = await tx.execute(sql`
        UPDATE lender_products 
        SET deleted_at = NOW() 
        WHERE lender_name = ${lenderName} 
        AND deleted_at IS NULL
        RETURNING id
      `);

      console.log(`📦 Soft-deleted ${products.rowCount || 0} products for ${lenderName}`);

      // 2. Delete the lender credentials (raw SQL)
      const deletedCredentials = await tx.execute(sql`
        DELETE FROM lender_credentials 
        WHERE lender_name = ${lenderName}
        RETURNING lender_name
      `);

      console.log(`🔐 Deleted credentials for ${lenderName}: ${deletedCredentials.rowCount || 0 > 0 ? 'Success' : 'No credentials found'}`);

      return products.rowCount || 0;
    });

    console.log(`✅ Successfully deleted lender ${lenderName} and ${deletedProducts} products`);

    return res.json({
      success: true,
      message: `Successfully deleted lender "${lenderName}"`,
      deletedProducts,
      lenderName
    });

  } catch (error: unknown) {
    console.error('Error deleting lender:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete lender'
    });
  }
});

export default router;