#!/usr/bin/env node

/**
 * Database Migration Script: Consolidate Financial Statements
 * 
 * This script updates all lender products in the database to replace:
 * - "Financial Statements" → "Accountant Prepared Financial Statements"
 * - "Audited Financials" → "Accountant Prepared Financial Statements"
 * 
 * Run with: node scripts/migrate-financial-statements.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateFinancialStatements() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Starting financial statements migration...');
    
    // Find all products with "Financial Statements" or "Audited Financials"
    const findQuery = `
      SELECT id, name, lender_name, doc_requirements 
      FROM lender_products 
      WHERE 'Financial Statements' = ANY(doc_requirements)
         OR 'Audited Financials' = ANY(doc_requirements);
    `;
    
    const result = await client.query(findQuery);
    console.log(`📋 Found ${result.rows.length} products with legacy financial statement requirements`);
    
    if (result.rows.length === 0) {
      console.log('✅ No products need migration - all already use consolidated format');
      return;
    }
    
    // Process each product
    let updateCount = 0;
    
    for (const product of result.rows) {
      const originalDocs = product.doc_requirements || [];
      const updatedDocs = originalDocs.map(doc => {
        if (doc === 'Financial Statements' || doc === 'Audited Financials') {
          return 'Accountant Prepared Financial Statements';
        }
        return doc;
      });
      
      // Remove duplicates in case both old formats existed
      const uniqueDocs = [...new Set(updatedDocs)];
      
      if (JSON.stringify(originalDocs) !== JSON.stringify(uniqueDocs)) {
        console.log(`🔄 Updating ${product.name} (${product.lender_name})`);
        console.log(`   Before: ${JSON.stringify(originalDocs)}`);
        console.log(`   After:  ${JSON.stringify(uniqueDocs)}`);
        
        const updateQuery = `
          UPDATE lender_products 
          SET doc_requirements = $1, updated_at = NOW()
          WHERE id = $2;
        `;
        
        await client.query(updateQuery, [uniqueDocs, product.id]);
        updateCount++;
      }
    }
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Updated ${updateCount} products`);
    console.log(`📊 Skipped ${result.rows.length - updateCount} products (already normalized)`);
    
    // Verify migration
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM lender_products 
      WHERE 'Financial Statements' = ANY(doc_requirements)
         OR 'Audited Financials' = ANY(doc_requirements);
    `;
    
    const verifyResult = await client.query(verifyQuery);
    const remainingCount = parseInt(verifyResult.rows[0].count);
    
    if (remainingCount === 0) {
      console.log('🎉 Verification passed: No legacy document types remain');
    } else {
      console.warn(`⚠️  Warning: ${remainingCount} products still contain legacy document types`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  migrateFinancialStatements()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateFinancialStatements };