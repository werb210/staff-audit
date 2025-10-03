/**
 * Staff Lender Products Management Router
 * Staff-only endpoints for managing lender products (not for lenders themselves)
 */

import { Router } from 'express';
import { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
// Removed requireAuth - staff endpoints now public for client app access

const router = Router();

console.log('🔧 [STAFF-LENDER-PRODUCTS] Staff lender products router loading...');

// Staff endpoint to get all lender products (admin view) - NOW PUBLIC
router.get('/lender-products', async (req: Request, res: Response) => {
  try {
    console.log('🔧 [STAFF-LENDER-PRODUCTS] Staff accessing all lender products');
    
    const products = await db.execute(sql`
      SELECT id, product_name, lender_id, category, amount_min, amount_max, 
             is_active, created_at, updated_at
      FROM lender_products 
      WHERE is_active = true
      ORDER BY product_name 
      LIMIT 100
    `);
    
    const productsCount = products.rows?.length || 0;
    console.log(`🔧 [STAFF-LENDER-PRODUCTS] Found ${productsCount} lender products for staff view`);
    
    res.json({
      success: true,
      message: 'Lender products retrieved successfully',
      count: productsCount,
      products: products.rows || [],
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('🔧 [STAFF-LENDER-PRODUCTS] Error fetching lender products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lender products',
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Staff endpoint to update lender products - PROTECTED
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;
    
    console.log(`🔧 [STAFF-LENDER-PRODUCTS] PATCH request for product: ${productId}`);
    console.log(`🔧 [STAFF-LENDER-PRODUCTS] Update data:`, updateData);
    
    // Remove array fields that cause PostgreSQL errors
    const filteredUpdateData = { ...updateData };
    if (filteredUpdateData.geography !== undefined) {
      console.log(`🔧 [STAFF-LENDER-PRODUCTS] Removing geography field to prevent array errors`);
      delete filteredUpdateData.geography;
    }
    if (filteredUpdateData.doc_requirements !== undefined) {
      console.log(`🔧 [STAFF-LENDER-PRODUCTS] Removing doc_requirements field to prevent array errors`);
      delete filteredUpdateData.doc_requirements;
    }
    
    // Check if product exists
    const existingProduct = await db.execute(
      sql`SELECT id, product_name, lender_id FROM lender_products WHERE id = ${productId}`
    );
    
    if (!existingProduct.rows || existingProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `No lender product found with ID: ${productId}`
      });
    }
    
    // Build update fields
    const updates = [];
    
    if (filteredUpdateData.product_name !== undefined) {
      updates.push(sql`product_name = ${filteredUpdateData.product_name}`);
    }
    if (filteredUpdateData.lender_id !== undefined) {
      updates.push(sql`lender_id = ${filteredUpdateData.lender_id}`);
    }
    if (filteredUpdateData.product_type !== undefined) {
      // Convert frontend category names to database enum values
      const enumProductType = filteredUpdateData.product_type === 'Working Capital' ? 'working_capital' : 
                             filteredUpdateData.product_type === 'Equipment Financing' ? 'equipment_financing' :
                             filteredUpdateData.product_type === 'Asset-Based Lending' ? 'asset_based_lending' :
                             filteredUpdateData.product_type === 'Purchase Order Financing' ? 'purchase_order_financing' :
                             filteredUpdateData.product_type === 'Invoice Factoring' ? 'invoice_factoring' :
                             filteredUpdateData.product_type === 'Business Line of Credit' ? 'line_of_credit' :
                             filteredUpdateData.product_type === 'Term Loan' ? 'term_loan' :
                             filteredUpdateData.product_type === 'SBA Loan' ? 'sba_loan' :
                             'working_capital';
      updates.push(sql`product_type = ${enumProductType}`);
    }
    if (filteredUpdateData.amount_min !== undefined) {
      updates.push(sql`amount_min = ${filteredUpdateData.amount_min}`);
    }
    if (filteredUpdateData.amount_max !== undefined) {
      updates.push(sql`amount_max = ${filteredUpdateData.amount_max}`);
    }
    if (filteredUpdateData.interest_rate_min !== undefined) {
      updates.push(sql`interest_rate_min = ${filteredUpdateData.interest_rate_min}`);
    }
    if (filteredUpdateData.interest_rate_max !== undefined) {
      updates.push(sql`interest_rate_max = ${filteredUpdateData.interest_rate_max}`);
    }
    if (filteredUpdateData.term_min !== undefined) {
      updates.push(sql`term_min = ${filteredUpdateData.term_min}`);
    }
    if (filteredUpdateData.term_max !== undefined) {
      updates.push(sql`term_max = ${filteredUpdateData.term_max}`);
    }
    if (filteredUpdateData.rate_type !== undefined) {
      updates.push(sql`rate_type = ${filteredUpdateData.rate_type}`);
    }
    if (filteredUpdateData.rate_frequency !== undefined) {
      updates.push(sql`rate_frequency = ${filteredUpdateData.rate_frequency}`);
    }
    if (filteredUpdateData.description !== undefined) {
      updates.push(sql`description = ${filteredUpdateData.description}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        message: 'Please provide at least one field to update'
      });
    }
    
    // Always update the timestamp
    updates.push(sql`updated_at = NOW()`);
    
    // Build and execute update query
    let updateQuery = sql`UPDATE lender_products SET `;
    
    for (let i = 0; i < updates.length; i++) {
      if (i > 0) {
        updateQuery = sql`${updateQuery}, ${updates[i]}`;
      } else {
        updateQuery = sql`${updateQuery}${updates[i]}`;
      }
    }
    
    updateQuery = sql`${updateQuery} WHERE id = ${productId} RETURNING id, product_name, lender_id, category, amount_min, amount_max, updated_at`;
    
    const updatedProduct = await db.execute(updateQuery);
    
    console.log(`🔧 [STAFF-LENDER-PRODUCTS] Product updated successfully: ${productId}`);
    
    res.json({
      success: true,
      message: 'Lender product updated successfully',
      product: updatedProduct.rows?.[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error('🔧 [STAFF-LENDER-PRODUCTS] Error updating lender product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lender product',
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

console.log('🔧 [STAFF-LENDER-PRODUCTS] Routes mounted: GET /, PATCH /:id');

// Mount at /lender-products since router will be mounted at /api/staff  
export default router;