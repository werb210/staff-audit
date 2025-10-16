#!/usr/bin/env tsx

import { db } from '../server/db.js';
import { lenderProducts } from '../shared/schema.js';
import { isNull } from 'drizzle-orm';
import * as fs from 'fs';

/**
 * Push 41 Lender Products to Production Database
 * Uses the existing backup data to populate production
 */

async function pushToProduction() {
  try {
    console.log('🚀 Starting production database population...');
    
    // Read the backup data
    const backupData = JSON.parse(fs.readFileSync('backups/lender_products_2025-07-05.json', 'utf8'));
    const products = backupData.products;
    
    console.log(`📊 Found ${products.length} products in backup`);
    
    // Check current production status
    const currentProducts = await db
      .select()
      .from(lenderProducts)
      .where(isNull(lenderProducts.deletedAt));
    
    console.log(`📋 Current production products: ${currentProducts.length}`);
    
    if (currentProducts.length >= 40) {
      console.log('✅ Production already has sufficient products');
      return;
    }
    
    // Prepare products for insertion
    const insertData = products.map(product => ({
      id: product.id,
      name: product.name,
      lenderName: product.lenderName,
      category: product.category,
      country: product.country,
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
      minRevenue: product.minRevenue || 0,
      description: product.description || `${product.name} by ${product.lenderName}`,
      docRequirements: product.docRequirements || [],
      tenantId: '00000000-0000-0000-0000-000000000000',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    }));
    
    console.log('🔄 Inserting products into production database...');
    
    // Insert products in batches to avoid timeouts
    const batchSize = 10;
    let inserted = 0;
    
    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize);
      
      try {
        await db.insert(lenderProducts).values(batch).onConflictDoNothing();
        inserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(insertData.length/batchSize)} (${inserted}/${insertData.length})`);
      } catch (error) {
        console.warn(`⚠️ Batch ${Math.floor(i/batchSize) + 1} failed, continuing...`, error.message);
      }
    }
    
    // Verify final count
    const finalProducts = await db
      .select()
      .from(lenderProducts)
      .where(isNull(lenderProducts.deletedAt));
    
    console.log(`🎯 Final production count: ${finalProducts.length} products`);
    
    if (finalProducts.length >= 40) {
      console.log('✅ Production database successfully populated!');
      console.log('🔗 Production API now ready: https://staffportal.replit.app/api/public/lenders');
    } else {
      console.log('❌ Production population incomplete');
    }
    
    return {
      success: true,
      finalCount: finalProducts.length,
      inserted: inserted
    };
    
  } catch (error) {
    console.error('❌ Production push failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  pushToProduction()
    .then((result) => {
      console.log('🎯 Production push completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Production push failed:', error);
      process.exit(1);
    });
}

export { pushToProduction };