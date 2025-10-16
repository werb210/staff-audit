/**
 * Create Fresh Test Lender with Known Password
 * Updates existing lender with known password for testing
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createTestLender() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log('🔍 Updating test lender with known password...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    // Update the existing lender user
    const updateResult = await client.query(
      `UPDATE lender_users 
       SET password_hash = $1 
       WHERE email = 'lender@boreal.com'`,
      [hashedPassword]
    );

    if (updateResult.rowCount > 0) {
      console.log('✅ Test lender password updated successfully!');
      console.log('📧 Email: lender@boreal.com');
      console.log('🔑 Password: testpass123');
      console.log('👤 Name: Mike Williams');
      console.log('🏢 Company: Boreal Financial');
    } else {
      console.log('❌ No lender user found to update');
    }

  } catch (error) {
    console.error('❌ Error updating test lender:', error.message);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  createTestLender();
}

module.exports = { createTestLender };