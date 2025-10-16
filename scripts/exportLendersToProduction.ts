/**
 * Export Lender Products from Development to Production
 * Step 1: Export all 41 non-deleted lender products from local DB
 */

import { db } from '../server/db';
import { lenderProducts } from '../shared/schema';
import { isNull } from 'drizzle-orm';
import fs from 'fs';

async function exportLendersToProduction() {
  console.log('🚀 Starting lender products export for production deployment...');
  console.log('=' .repeat(60));

  try {
    // Step 1: Query all non-deleted lender products
    console.log('📊 Querying development database for active lender products...');
    const products = await db
      .select()
      .from(lenderProducts)
      .where(isNull(lenderProducts.deletedAt));

    console.log(`✅ Found ${products.length} active lender products`);

    if (products.length === 0) {
      console.log('❌ No products found in development database');
      return;
    }

    // Step 2: Prepare export data structure
    console.log('🔄 Preparing export data structure...');
    const exportData = {
      timestamp: new Date().toISOString(),
      totalProducts: products.length,
      sourceEnvironment: 'development',
      targetEnvironment: 'production',
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        lenderName: product.lenderName,
        category: product.category,
        country: product.country,
        minAmount: product.minAmount,
        maxAmount: product.maxAmount,
        minRevenue: product.minRevenue,
        description: product.description,
        docRequirements: product.docRequirements,
        tenantId: product.tenantId,
        isActive: product.isActive,
        productCategory: product.productCategory,
        productName: product.productName,
        productType: product.productType,
        industries: product.industries,
        geography: product.geography,
        videoUrl: product.videoUrl,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
        // Note: deletedAt is intentionally excluded as we're only exporting active products
      }))
    };

    // Step 3: Write export file
    const filename = `lender_products_export_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Export completed successfully`);
    console.log(`📄 File created: ${filename}`);
    console.log(`📊 Products exported: ${exportData.totalProducts}`);

    // Step 4: Generate summary report
    const categorySummary = products.reduce((acc, product) => {
      const category = product.category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const countrySummary = products.reduce((acc, product) => {
      const country = product.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📋 Export Summary:');
    console.log(`Total Products: ${exportData.totalProducts}`);
    console.log('\nBy Category:');
    Object.entries(categorySummary).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} products`);
    });
    console.log('\nBy Country:');
    Object.entries(countrySummary).forEach(([country, count]) => {
      console.log(`  ${country}: ${count} products`);
    });

    // Step 5: Create backup in backups folder
    const backupFilename = `backups/lender_products_${new Date().toISOString().split('T')[0]}.json`;
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups', { recursive: true });
    }
    fs.writeFileSync(backupFilename, JSON.stringify(exportData, null, 2));
    console.log(`📄 Backup created: ${backupFilename}`);

    console.log('\n🎯 Next Steps:');
    console.log('1. Deploy the application to production');
    console.log('2. Run import script in production environment');
    console.log('3. Verify production database has 41 products');
    console.log('4. Test all lender product endpoints');

    return exportData;

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

// Run export
if (import.meta.url === `file://${process.argv[1]}`) {
  exportLendersToProduction()
    .then(data => {
      console.log('\n✅ Export completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportLendersToProduction };