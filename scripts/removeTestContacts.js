#!/usr/bin/env node

/**
 * REMOVE TEST CONTACTS SCRIPT
 * Removes all test/placeholder contacts before importing real SLF data
 */

import { db } from '../server/db.js';
import { contacts } from '../shared/schema.js';
import { or, like, eq } from 'drizzle-orm';

async function main() {
  console.log('🧹 REMOVING TEST CONTACTS...');
  
  try {
    // Remove ALL SLF contacts to replace with external data
    const deleted = await db.delete(contacts).where(eq(contacts.silo, 'slf'));
    
    console.log(`✅ Deleted ${deleted.rowCount || 0} test contacts`);
    
    // Show remaining counts
    const remainingBF = await db.select().from(contacts).where(eq(contacts.silo, 'bf'));
    const remainingSLF = await db.select().from(contacts).where(eq(contacts.silo, 'slf'));
    
    console.log(`📊 Remaining: BF=${remainingBF.length}, SLF=${remainingSLF.length}`);
    console.log('🎯 Database ready for real SLF contact import');
    
  } catch (error) {
    console.error('❌ Error removing test contacts:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('✅ Test contact cleanup complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Cleanup failed:', error);
  process.exit(1);
});