#!/usr/bin/env tsx

/**
 * Database Integrity Backfill Script
 * Ensures proper document associations and fixes any data inconsistencies
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { applications, expectedDocuments, documents } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

// Database connection
const neonClient = neon(process.env.DATABASE_URL!);
const db = drizzle(neonClient);

interface BackfillStats {
  applicationsProcessed: number;
  documentsUpdated: number;
  expectedDocumentsFixed: number;
  orphansRemoved: number;
}

async function runDatabaseIntegrityBackfill(): Promise<BackfillStats> {
  console.log('🔧 Starting Database Integrity Backfill...');
  
  const stats: BackfillStats = {
    applicationsProcessed: 0,
    documentsUpdated: 0,
    expectedDocumentsFixed: 0,
    orphansRemoved: 0
  };

  try {
    // 1. Remove any orphaned expected_documents
    console.log('🧹 Step 1: Removing orphaned expected_documents...');
    const orphanedResult = await db.execute(sql`
      DELETE FROM expected_documents 
      WHERE application_id NOT IN (SELECT id FROM applications)
    `);
    stats.orphansRemoved = orphanedResult.rowCount || 0;
    console.log(`✅ Removed ${stats.orphansRemoved} orphaned expected_documents`);

    // 2. Remove old draft applications (older than 1 day)
    console.log('🧹 Step 2: Removing old draft applications...');
    const oldDraftsResult = await db.execute(sql`
      DELETE FROM applications 
      WHERE status = 'draft' AND created_at < NOW() - INTERVAL '1 day'
    `);
    console.log(`✅ Removed ${oldDraftsResult.rowCount || 0} old draft applications`);

    // 3. Get all applications for processing
    console.log('📋 Step 3: Processing applications and document associations...');
    const allApplications = await db.select().from(applications);
    stats.applicationsProcessed = allApplications.length;
    
    for (const application of allApplications) {
      console.log(`🔍 Processing application: ${application.id}`);
      
      // Get uploaded documents for this application
      const uploadedDocs = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, application.id));
      
      // Get expected documents for this application
      const expectedDocs = await db
        .select()
        .from(expectedDocuments)
        .where(eq(expectedDocuments.applicationId, application.id));
      
      console.log(`  📄 Found ${uploadedDocs.length} uploaded docs, ${expectedDocs.length} expected docs`);
      
      // Update expected documents status based on uploaded documents
      for (const expectedDoc of expectedDocs) {
        const matchingUpload = uploadedDocs.find(doc => 
          doc.documentType === expectedDoc.documentType
        );
        
        if (matchingUpload && expectedDoc.status !== 'uploaded') {
          await db
            .update(expectedDocuments)
            .set({ 
              status: 'uploaded',
              updatedAt: new Date()
            })
            .where(eq(expectedDocuments.id, expectedDoc.id));
          
          stats.expectedDocumentsFixed++;
          console.log(`  ✅ Updated ${expectedDoc.documentType} status to 'uploaded'`);
        }
      }
      
      // Ensure documents have proper metadata
      for (const doc of uploadedDocs) {
        if (!doc.updatedAt) {
          await db
            .update(documents)
            .set({ updatedAt: new Date() })
            .where(eq(documents.id, doc.id));
          
          stats.documentsUpdated++;
          console.log(`  🔧 Fixed missing updatedAt for document: ${doc.id}`);
        }
      }
    }

    // 4. Verify data integrity
    console.log('🔍 Step 4: Verifying data integrity...');
    
    // Check for any remaining orphaned records
    const remainingOrphans = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM expected_documents 
      WHERE application_id NOT IN (SELECT id FROM applications)
    `);
    
    const duplicateApps = await db.execute(sql`
      SELECT COUNT(*) as count, MAX(created_at) - MIN(created_at) as time_diff
      FROM applications 
      WHERE status != 'draft'
      GROUP BY form_data->>'step4'->>'email'
      HAVING COUNT(*) > 1
    `);
    
    console.log('📊 Integrity Check Results:');
    console.log(`  - Remaining orphaned documents: ${remainingOrphans.rows[0]?.count || 0}`);
    console.log(`  - Duplicate applications: ${duplicateApps.rowCount || 0}`);
    
    return stats;
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  }
}

async function main() {
  try {
    const stats = await runDatabaseIntegrityBackfill();
    
    console.log('\n🎉 Database Integrity Backfill Complete!');
    console.log('📊 Final Statistics:');
    console.log(`  ✓ Applications processed: ${stats.applicationsProcessed}`);
    console.log(`  ✓ Documents updated: ${stats.documentsUpdated}`);
    console.log(`  ✓ Expected documents fixed: ${stats.expectedDocumentsFixed}`);
    console.log(`  ✓ Orphaned records removed: ${stats.orphansRemoved}`);
    
    if (stats.applicationsProcessed === 0) {
      console.log('ℹ️  Database was already clean - no issues found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Backfill script failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runDatabaseIntegrityBackfill };