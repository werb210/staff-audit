/**
 * Fix Industry Benchmarking Database Constraints
 * Adds unique constraint on application_id for ON CONFLICT functionality
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixBenchmarkConstraints() {
  console.log('🔧 Fixing Industry Benchmarking Database Constraints...');

  try {
    // Add unique constraint on application_id for ON CONFLICT support
    console.log('🔑 Adding unique constraint on application_id...');
    await pool.query(`
      ALTER TABLE benchmark_comparisons 
      ADD CONSTRAINT unique_application_id UNIQUE (application_id);
    `);

    console.log('✅ Unique constraint added successfully');

    // Verify constraint exists
    const constraintCheck = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'benchmark_comparisons' 
      AND constraint_type = 'UNIQUE';
    `);

    console.log('\n📊 CONSTRAINT VERIFICATION:');
    console.log(`✅ Unique constraints found: ${constraintCheck.rows.length}`);
    constraintCheck.rows.forEach(row => {
      console.log(`   - ${row.constraint_name}: ${row.constraint_type}`);
    });

    console.log('\n🎯 DATABASE CONSTRAINTS FIXED');
    console.log('═════════════════════════════════════════');
    console.log('• Unique constraint on application_id added');
    console.log('• ON CONFLICT functionality now supported');
    console.log('• Industry benchmarking ready for testing');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Unique constraint already exists - no action needed');
    } else {
      console.error('❌ Error fixing constraints:', error);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

fixBenchmarkConstraints();