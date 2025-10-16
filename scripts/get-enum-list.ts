#!/usr/bin/env tsx

/**
 * Get canonical document_type enum list from Staff Application backend
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function getDocumentTypeEnums() {
  console.log('🔍 Querying Staff Application backend for canonical document_type enums...');
  
  try {
    // Query the database for all enum values
    const result = await db.execute(
      sql`SELECT unnest(enum_range(NULL::document_type)) AS document_type ORDER BY document_type`
    );
    
    console.log('\n✅ CANONICAL DOCUMENT_TYPE ENUM LIST (Staff Application Backend):');
    console.log('=' .repeat(70));
    
    const enumList: string[] = [];
    result.forEach((row: any, index: number) => {
      const docType = row.document_type;
      enumList.push(docType);
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${docType}`);
    });
    
    console.log('=' .repeat(70));
    console.log(`📊 Total Count: ${enumList.length} official document types`);
    
    // Export as TypeScript array for easy copying
    console.log('\n📋 TypeScript Array Format:');
    console.log('[');
    enumList.forEach((type, index) => {
      const comma = index < enumList.length - 1 ? ',' : '';
      console.log(`  '${type}'${comma}`);
    });
    console.log(']');
    
    // Export as JSON for integration
    console.log('\n📋 JSON Format:');
    console.log(JSON.stringify(enumList, null, 2));
    
    return enumList;
    
  } catch (error) {
    console.error('❌ Error querying document_type enums:', error);
    throw error;
  }
}

// Run the script
async function main() {
  try {
    await getDocumentTypeEnums();
    console.log('\n✅ Enum list retrieval completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { getDocumentTypeEnums };