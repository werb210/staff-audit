/**
 * Database Cleanup Script
 * Removes all test applications, documents, and related data
 */

const { db } = require('./server/db');
const { 
  applications, 
  businesses, 
  users, 
  documents, 
  applicationDocuments,
  financialProfiles,
  ocrResults
} = require('./shared/schema');
const { eq, ne, count } = require('drizzle-orm');
const fs = require('fs');
const path = require('path');

async function cleanupTestData() {
  console.log('🧹 STARTING DATABASE CLEANUP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Step 1: Get count of records before cleanup
    console.log('\n📊 Counting records before cleanup...');
    
    const beforeCounts = {
      applications: await db.select({ count: count() }).from(applications),
      businesses: await db.select({ count: count() }).from(businesses),
      users: await db.select({ count: count() }).from(users),
      documents: await db.select({ count: count() }).from(documents),
      applicationDocuments: await db.select({ count: count() }).from(applicationDocuments)
    };
    
    console.log(`   Applications: ${beforeCounts.applications[0].count}`);
    console.log(`   Businesses: ${beforeCounts.businesses[0].count}`);
    console.log(`   Users: ${beforeCounts.users[0].count}`);
    console.log(`   Documents: ${beforeCounts.documents[0].count}`);
    console.log(`   Application Documents: ${beforeCounts.applicationDocuments[0].count}`);

    // Step 2: Identify admin user to preserve
    console.log('\n🔒 Identifying admin user to preserve...');
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@boreal.com'))
      .limit(1);
    
    if (adminUser) {
      console.log(`   Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);
    } else {
      console.log('   No admin user found - will preserve first user with admin role');
    }

    // Step 3: Clean up file system documents
    console.log('\n📁 Cleaning up uploaded files...');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (fs.existsSync(uploadsDir)) {
      const applicationDirs = fs.readdirSync(uploadsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      let deletedFiles = 0;
      for (const appDir of applicationDirs) {
        const appDirPath = path.join(uploadsDir, appDir);
        if (fs.existsSync(appDirPath)) {
          const files = fs.readdirSync(appDirPath);
          for (const file of files) {
            fs.unlinkSync(path.join(appDirPath, file));
            deletedFiles++;
          }
          fs.rmdirSync(appDirPath);
        }
      }
      console.log(`   Deleted ${deletedFiles} files from ${applicationDirs.length} application directories`);
    } else {
      console.log('   No uploads directory found');
    }

    // Step 4: Delete related data tables (in dependency order)
    console.log('\n🗑️  Deleting related data...');
    
    // Delete OCR results
    try {
      const deletedOcrResults = await db.delete(ocrResults);
      console.log(`   OCR Results: ${deletedOcrResults.rowCount || 0} deleted`);
    } catch (error) {
      console.log(`   OCR Results: Table not found or empty`);
    }

    // Delete other V2 module data if tables exist
    const v2Tables = [
      'fraud_detection_results',
      'document_similarity', 
      'risk_assessments',
      'banking_analysis',
      'communication_logs',
      'sms_logs',
      'otp_verifications'
    ];

    for (const tableName of v2Tables) {
      try {
        await db.execute(`DELETE FROM ${tableName}`);
        console.log(`   ${tableName}: cleared`);
      } catch (error) {
        console.log(`   ${tableName}: Table not found or empty`);
      }
    }

    // Step 5: Delete application documents
    console.log('\n📄 Deleting application documents...');
    const deletedAppDocs = await db.delete(applicationDocuments);
    console.log(`   Application Documents: ${deletedAppDocs.rowCount || 0} deleted`);

    // Step 6: Delete documents
    console.log('\n📋 Deleting documents...');
    const deletedDocs = await db.delete(documents);
    console.log(`   Documents: ${deletedDocs.rowCount || 0} deleted`);

    // Step 7: Delete financial profiles
    console.log('\n💰 Deleting financial profiles...');
    try {
      const deletedFinancialProfiles = await db.delete(financialProfiles);
      console.log(`   Financial Profiles: ${deletedFinancialProfiles.rowCount || 0} deleted`);
    } catch (error) {
      console.log(`   Financial Profiles: Table not found or empty`);
    }

    // Step 8: Delete applications
    console.log('\n📑 Deleting applications...');
    const deletedApps = await db.delete(applications);
    console.log(`   Applications: ${deletedApps.rowCount || 0} deleted`);

    // Step 9: Delete businesses (except admin's business if exists)
    console.log('\n🏢 Deleting businesses...');
    let deletedBusinesses;
    if (adminUser) {
      deletedBusinesses = await db
        .delete(businesses)
        .where(ne(businesses.userId, adminUser.id));
    } else {
      deletedBusinesses = await db.delete(businesses);
    }
    console.log(`   Businesses: ${deletedBusinesses.rowCount || 0} deleted`);

    // Step 10: Delete users (except admin user)
    console.log('\n👥 Deleting users...');
    let deletedUsers;
    if (adminUser) {
      deletedUsers = await db
        .delete(users)
        .where(ne(users.id, adminUser.id));
    } else {
      // Keep first admin role user
      const [firstAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);
      
      if (firstAdmin) {
        deletedUsers = await db
          .delete(users)
          .where(ne(users.id, firstAdmin.id));
        console.log(`   Preserved admin user: ${firstAdmin.email}`);
      } else {
        deletedUsers = await db.delete(users);
      }
    }
    console.log(`   Users: ${deletedUsers.rowCount || 0} deleted`);

    // Step 11: Get final counts
    console.log('\n📊 Final record counts...');
    
    const afterCounts = {
      applications: await db.select({ count: count() }).from(applications),
      businesses: await db.select({ count: count() }).from(businesses),
      users: await db.select({ count: count() }).from(users),
      documents: await db.select({ count: count() }).from(documents),
      applicationDocuments: await db.select({ count: count() }).from(applicationDocuments)
    };
    
    console.log(`   Applications: ${afterCounts.applications[0].count}`);
    console.log(`   Businesses: ${afterCounts.businesses[0].count}`);
    console.log(`   Users: ${afterCounts.users[0].count}`);
    console.log(`   Documents: ${afterCounts.documents[0].count}`);
    console.log(`   Application Documents: ${afterCounts.applicationDocuments[0].count}`);

    // Step 12: Summary
    console.log('\n✅ CLEANUP COMPLETED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 SUMMARY:');
    console.log(`   🗑️  Applications deleted: ${beforeCounts.applications[0].count - afterCounts.applications[0].count}`);
    console.log(`   🗑️  Businesses deleted: ${beforeCounts.businesses[0].count - afterCounts.businesses[0].count}`);
    console.log(`   🗑️  Users deleted: ${beforeCounts.users[0].count - afterCounts.users[0].count}`);
    console.log(`   🗑️  Documents deleted: ${beforeCounts.documents[0].count - afterCounts.documents[0].count}`);
    console.log(`   🗑️  Application Documents deleted: ${beforeCounts.applicationDocuments[0].count - afterCounts.applicationDocuments[0].count}`);
    
    if (adminUser) {
      console.log(`   🔒 Preserved admin user: ${adminUser.email}`);
    }
    
    console.log('\n🎯 Database is now clean and ready for production use!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupTestData()
    .then(() => {
      console.log('\n🏁 Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTestData };