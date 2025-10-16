import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Enum Snapshot Generator Script
 * 
 * Generates the enum snapshot lockfile from current database state
 * Only run this when intentionally updating the canonical enum list
 * 
 * Usage: npx tsx scripts/generateEnumSnapshot.ts
 * Warning: This overwrites the existing snapshot - use with caution
 */

async function generateEnumSnapshot() {
  console.log('🔄 [ENUM-GENERATOR] Starting enum snapshot generation...');
  console.log('⚠️  [WARNING] This will overwrite the existing enum snapshot lockfile');
  
  try {
    // Query live database enum values
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ [ENUM-GENERATOR] DATABASE_URL environment variable not found');
      process.exit(1);
    }
    
    console.log('🔗 [ENUM-GENERATOR] Connecting to database to fetch current enum values...');
    
    const liveEnumRaw = execSync(
      `psql "${databaseUrl}" -c "SELECT unnest(enum_range(NULL::document_type)) ORDER BY 1" -t`,
      { encoding: 'utf8' }
    )
      .toString()
      .trim()
      .split('\n')
      .map(v => v.trim())
      .filter(v => v.length > 0); // Remove empty lines
    
    console.log(`📊 [ENUM-GENERATOR] Found ${liveEnumRaw.length} enum values in database`);
    
    // Create snapshot directory if it doesn't exist
    const snapshotDir = 'shared/enums';
    const snapshotPath = path.join(snapshotDir, 'documentTypeSnapshot.json');
    
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
      console.log(`📁 [ENUM-GENERATOR] Created directory: ${snapshotDir}`);
    }
    
    // Generate snapshot content
    const snapshotContent = JSON.stringify(liveEnumRaw, null, 2);
    
    // Write snapshot file
    fs.writeFileSync(snapshotPath, snapshotContent, 'utf8');
    
    console.log(`✅ [ENUM-GENERATOR] Generated enum snapshot: ${snapshotPath}`);
    console.log(`📋 [ENUM-GENERATOR] Snapshot contains ${liveEnumRaw.length} enum values`);
    
    // Display generated values
    console.log('\n📊 [ENUM-GENERATOR] Generated enum values:');
    liveEnumRaw.forEach((val, index) => {
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${val}`);
    });
    
    // Generate metadata
    const metadata = {
      generatedAt: new Date().toISOString(),
      enumCount: liveEnumRaw.length,
      databaseSource: 'document_type enum',
      version: '1.0.0'
    };
    
    const metadataPath = path.join(snapshotDir, 'documentTypeSnapshot.meta.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    
    console.log(`📄 [ENUM-GENERATOR] Generated metadata: ${metadataPath}`);
    console.log(`🎉 [ENUM-GENERATOR] Snapshot generation completed successfully at ${metadata.generatedAt}`);
    
    // Remind user about validation
    console.log('\n💡 [NEXT-STEPS] Remember to:');
    console.log('1. Run validateEnumSnapshot.ts to verify the new snapshot');
    console.log('2. Update any dependent code that references enum values');
    console.log('3. Test all document upload endpoints with new enum values');
    console.log('4. Commit the new snapshot to version control');
    
  } catch (error: any) {
    console.error('🚨 [ENUM-GENERATOR] Generation failed with error:', error.message);
    console.error('🔧 [DEBUG] Error details:', error);
    
    if (error.message.includes('psql')) {
      console.error('💡 [HINT] Ensure PostgreSQL client (psql) is installed and DATABASE_URL is correct');
    }
    
    process.exit(1);
  }
}

// Run generation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateEnumSnapshot();
}

export { generateEnumSnapshot };