import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function cleanOrphanedDocuments() {
  console.log('🚨 CLEANUP SCRIPT PERMANENTLY DISABLED');
  console.log('');
  console.log('❌ This script caused CRITICAL DATA LOSS incident on July 17, 2025');
  console.log('❌ Multiple applications lost all documents due to flawed cleanup logic');
  console.log('❌ Automatic cleanup is PERMANENTLY DISABLED to prevent further data loss');
  console.log('');
  console.log('🔍 For system analysis, use:');
  console.log('   npm run audit:integrity');
  console.log('');
  console.log('📊 For damage assessment, see:');
  console.log('   COMPREHENSIVE_DAMAGE_ASSESSMENT.md');
  console.log('');
  console.log('⚠️ Any cleanup must be done manually with explicit verification');
  console.log('⚠️ This protection cannot be overridden');
  return;

  // DISABLED CODE - DO NOT EXECUTE
  const allDocs = await sql`SELECT * FROM documents ORDER BY created_at DESC`;
  console.log(`📄 Found ${allDocs.length} document records in database`);
  
  // SAFETY CHECK: Prevent mass deletion
  if (allDocs.length > 10) {
    console.log(`🚨 SAFETY ABORT: Would delete ${allDocs.length} documents. Manual review required.`);
    console.log(`Use FORCE_CLEANUP=true environment variable to override.`);
    return;
  }

  if (!process.env.FORCE_CLEANUP) {
    console.log(`🚨 SAFETY: Auto-cleanup disabled. Set FORCE_CLEANUP=true to enable.`);
    return;
  }

  // Only delete documents that have no physical files AND no valid application
  const result = await sql`
    DELETE FROM documents 
    WHERE id IN (
      SELECT d.id FROM documents d
      WHERE NOT EXISTS (
        SELECT 1 FROM applications a WHERE a.id = d.application_id
      )
    )
    AND created_at < NOW() - INTERVAL '7 days'
    LIMIT 10
  `;
  
  console.log(`🗑️ Deleted ${allDocs.length} orphaned document records`);
  
  // Verify cleanup
  const remaining = await sql`SELECT COUNT(*) as count FROM documents`;
  console.log(`✅ Cleanup complete. Remaining documents: ${remaining[0].count}`);
  
  console.log(`\n📊 CLEANUP SUMMARY:`);
  console.log(`🗑️ Removed: ${allDocs.length} orphaned records`);
  console.log(`📁 Remaining: ${remaining[0].count} valid records`);
  console.log(`\n✅ Database is now clean and ready for fresh document uploads!`);
}

cleanOrphanedDocuments().catch(console.error);