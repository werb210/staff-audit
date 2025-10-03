/**
 * Export Lender Products from Development Database
 * Exports all lender products to JSON for production deployment
 */

import { db } from '../server/db.ts';
import { lenderProducts } from '../shared/schema.ts';
import { isNull } from 'drizzle-orm';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function exportLenderProducts() {
  const outputFile = process.argv.find(arg => arg.startsWith('--out='))?.split('=')[1] 
    || `./backups/lender_products_${new Date().toISOString().split('T')[0]}.json`;

  console.log('🚀 Exporting lender products from development database...');
  
  try {
    // Ensure backups directory exists
    const backupsDir = './backups';
    mkdirSync(backupsDir, { recursive: true });

    // Query all active lender products
    const products = await db
      .select()
      .from(lenderProducts)
      .where(isNull(lenderProducts.deletedAt));

    console.log(`📋 Found ${products.length} active lender products`);

    // Transform for export
    const exportData = {
      exported_at: new Date().toISOString(),
      environment: 'development',
      count: products.length,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        lenderName: product.lenderName,
        category: product.category,
        country: product.country,
        minAmount: product.minAmount,
        maxAmount: product.maxAmount,
        minRevenue: product.minRevenue,
        docRequirements: product.docRequirements,
        tenantId: product.tenantId,
        productName: product.productName,
        productType: product.productType,
        geography: product.geography,
        industries: product.industries,
        description: product.description,
        videoUrl: product.videoUrl,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }))
    };

    // Write to file
    writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Export completed successfully!`);
    console.log(`📁 File: ${outputFile}`);
    console.log(`📊 Products exported: ${exportData.count}`);
    
    // Show category breakdown
    const categoryBreakdown = exportData.products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📋 Category breakdown:');
    Object.entries(categoryBreakdown).forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Run export
exportLenderProducts()
  .then(() => {
    console.log('🎉 Export process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Export process failed:', error);
    process.exit(1);
  });