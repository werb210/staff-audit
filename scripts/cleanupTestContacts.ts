#!/usr/bin/env node

/**
 * CLEANUP TEST CONTACTS SCRIPT
 * Removes all test/placeholder contacts before integrating live SLF data
 */

import { db } from '../server/db.js';
import { contacts } from '../shared/schema.js';
import { or, like, eq } from 'drizzle-orm';

async function main() {
  console.log('🧹 CLEANING UP TEST CONTACTS...');
  
  try {
    // Define test contact patterns to remove
    const testPatterns = [
      'slf.champion@ultimate.ca',
      'slf.user@boreal.test', 
      'fake.contact@placeholder.com',
      'test.bf@boreal.test',
      'ultimate.winner@success.ca',
      'success@test.ca',
      'final.test@ultimate.ca',
      '%test%',
      '%fake%',
      '%placeholder%',
      '%demo%',
      '%sample%'
    ];
    
    // Remove contacts matching test patterns
    const deleted = await db.delete(contacts).where(
      or(
        ...testPatterns.map(pattern => 
          pattern.includes('%') 
            ? like(contacts.email, pattern)
            : eq(contacts.email, pattern)
        )
      )
    );
    
    console.log(`✅ Deleted ${deleted.rowCount || 0} test contacts from database`);
    
    // Show remaining contact count by silo
    const remainingBF = await db.select().from(contacts).where(eq(contacts.silo, 'bf'));
    const remainingSLF = await db.select().from(contacts).where(eq(contacts.silo, 'slf'));
    
    console.log(`📊 Remaining contacts: BF=${remainingBF.length}, SLF=${remainingSLF.length}`);
    console.log('🎯 Database is now clean and ready for live SLF integration');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('✅ Cleanup complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Cleanup failed:', error);
  process.exit(1);
});