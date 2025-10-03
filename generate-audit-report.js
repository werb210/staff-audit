// Quick script to generate document audit report
const { runFullDocumentAudit, generateAuditReport } = require('./server/utils/documentAuditReport.ts');

async function runAudit() {
  try {
    console.log('🔍 Running comprehensive document audit...');
    const results = await runFullDocumentAudit();
    
    console.log('\n📊 AUDIT RESULTS SUMMARY:');
    console.log('='.repeat(50));
    
    let totalApps = 0;
    let totalDocuments = 0;
    let totalAccessible = 0;
    let totalMissing = 0;
    
    for (const app of results) {
      totalApps++;
      totalDocuments += app.documentsInDB;
      totalAccessible += app.filesOnDisk;
      totalMissing += app.missingFiles;
      
      const recoveryRate = app.documentsInDB > 0 
        ? Math.round((app.filesOnDisk / app.documentsInDB) * 100) 
        : 0;
        
      console.log(`📁 ${app.businessName} (${app.applicationId.substring(0, 8)}...)`);
      console.log(`   DB: ${app.documentsInDB} | Found: ${app.filesOnDisk} | Missing: ${app.missingFiles} | Recovery: ${recoveryRate}%`);
    }
    
    const overallRecovery = totalDocuments > 0 ? Math.round((totalAccessible / totalDocuments) * 100) : 0;
    
    console.log('\n🎯 OVERALL STATISTICS:');
    console.log(`Applications Audited: ${totalApps}`);
    console.log(`Total Documents in DB: ${totalDocuments}`);
    console.log(`Total Files Accessible: ${totalAccessible}`);
    console.log(`Total Files Missing: ${totalMissing}`);
    console.log(`Overall Recovery Rate: ${overallRecovery}%`);
    
    // Show applications with recovered documents
    const recoveredApps = results.filter(app => app.filesOnDisk > 0 && app.missingFiles < app.documentsInDB);
    if (recoveredApps.length > 0) {
      console.log(`\n✅ RECOVERY SUCCESS: ${recoveredApps.length} applications have some/all documents recovered!`);
    }
    
    // Show applications still missing all documents
    const completelyMissingApps = results.filter(app => app.filesOnDisk === 0 && app.documentsInDB > 0);
    if (completelyMissingApps.length > 0) {
      console.log(`\n❌ STILL MISSING: ${completelyMissingApps.length} applications have no accessible documents`);
    }
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

runAudit();