import { db } from "../server/db";
import { documents } from "../shared/schema";
import { eq, isNull } from "drizzle-orm";
import { writeFileSync } from "fs";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

// Import S3 configuration
async function getS3Client() {
  const { s3Client, S3_CONFIG } = await import("../server/config/s3Config");
  return { s3Client, bucket: S3_CONFIG.bucket || S3_CONFIG.bucketName };
}

async function listAllObjects(): Promise<string[]> {
  try {
    const { s3Client, bucket } = await getS3Client();
    const command = new ListObjectsV2Command({ Bucket: bucket });
    const response = await s3Client.send(command);
    return (response.Contents || []).map((obj) => obj.Key || "").filter(Boolean);
  } catch (error) {
    console.error("❌ Error listing S3 objects:", error);
    return [];
  }
}

async function runWeeklyAudit() {
  console.log("🔍 [S3 WEEKLY AUDIT] Starting comprehensive S3 vs Database audit...");
  
  try {
    // Get all documents from database (skip deletedAt filter to avoid SQL issues)
    const dbDocs = await db.select().from(documents);
    console.log(`📊 Found ${dbDocs.length} documents in database`);
    
    // Get all S3 objects
    const s3Keys = await listAllObjects();
    console.log(`📊 Found ${s3Keys.length} objects in S3`);
    
    // Find documents in DB but missing from S3
    const missingInS3 = dbDocs.filter((doc) => {
      if (!doc.storageKey) return false; // Skip documents without S3 storage keys
      return !s3Keys.includes(doc.storageKey);
    });
    
    // Find S3 objects without corresponding DB records
    const orphanedInS3 = s3Keys.filter(
      (key) => !dbDocs.some((doc) => doc.storageKey === key)
    );
    
    // Find documents with missing storage keys
    const missingStorageKeys = dbDocs.filter((doc) => !doc.storageKey);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDbDocs: dbDocs.length,
        totalS3Keys: s3Keys.length,
        missingInS3Count: missingInS3.length,
        orphanedInS3Count: orphanedInS3.length,
        missingStorageKeysCount: missingStorageKeys.length
      },
      issues: {
        missingInS3: missingInS3.map((d) => ({ 
          id: d.id, 
          applicationId: d.applicationId,
          fileName: d.fileName,
          storageKey: d.storageKey,
          uploadedAt: d.uploadedAt
        })),
        orphanedInS3: orphanedInS3,
        missingStorageKeys: missingStorageKeys.map((d) => ({
          id: d.id,
          applicationId: d.applicationId, 
          fileName: d.fileName,
          uploadedAt: d.uploadedAt
        }))
      },
      recommendations: []
    };
    
    // Generate recommendations
    if (missingInS3.length > 0) {
      report.recommendations.push(`❌ ${missingInS3.length} documents are missing from S3 - investigate data loss`);
    }
    if (orphanedInS3.length > 0) {
      report.recommendations.push(`🧹 ${orphanedInS3.length} orphaned files in S3 - consider cleanup`);
    }
    if (missingStorageKeys.length > 0) {
      report.recommendations.push(`🔗 ${missingStorageKeys.length} documents missing storage keys - needs migration`);
    }
    if (missingInS3.length === 0 && orphanedInS3.length === 0 && missingStorageKeys.length === 0) {
      report.recommendations.push("✅ Perfect S3/Database synchronization - no issues found");
    }
    
    // Save detailed report
    const auditFileName = `audit-weekly-s3-${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(auditFileName, JSON.stringify(report, null, 2));
    
    // Console summary
    console.log("\n🏆 [S3 WEEKLY AUDIT] SUMMARY:");
    console.log(`📊 Database Documents: ${report.summary.totalDbDocs}`);
    console.log(`☁️  S3 Objects: ${report.summary.totalS3Keys}`);
    console.log(`❌ Missing in S3: ${report.summary.missingInS3Count}`);
    console.log(`🧹 Orphaned in S3: ${report.summary.orphanedInS3Count}`);
    console.log(`🔗 Missing Storage Keys: ${report.summary.missingStorageKeysCount}`);
    
    console.log("\n📋 RECOMMENDATIONS:");
    report.recommendations.forEach(rec => console.log(`   ${rec}`));
    
    console.log(`\n✅ S3 Weekly Audit complete. Detailed results saved to ${auditFileName}`);
    
    return report;
    
  } catch (error: any) {
    console.error("❌ [S3 WEEKLY AUDIT] Error:", error.message);
    
    const errorReport = {
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    writeFileSync(`audit-weekly-s3-ERROR-${Date.now()}.json`, JSON.stringify(errorReport, null, 2));
    throw error;
  }
}

// Run audit if called directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  runWeeklyAudit()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Audit failed:", error);
      process.exit(1);
    });
}

export { runWeeklyAudit, listAllObjects };