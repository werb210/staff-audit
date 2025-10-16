/**
 * Create Test Application Data
 * Creates the required application data for testing the public API endpoints
 */

const { neon } = require("@neondatabase/serverless");

async function createTestApplicationData() {
  const sql = neon(process.env.DATABASE_URL);
  
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testTenantId = '00000000-0000-0000-0000-000000000000';
  const testBusinessId = '00000000-0000-0000-0000-000000000002';
  const testApplicationId = '00000000-0000-0000-0000-000000000003';

  console.log('🔧 Creating test application data...');

  try {
    // Create test user
    await sql`
      INSERT INTO users (id, email, username, password_hash, first_name, last_name, phone, tenant_id, role, created_at, updated_at)
      VALUES (${testUserId}, 'test@example.com', 'testuser', 'dummy_hash', 'Test', 'User', '+15551234567', ${testTenantId}, 'client', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Test user created/exists');

    // Create test business
    await sql`
      INSERT INTO businesses (id, business_name, industry, tenant_id, user_id, business_type, year_established, description, created_at, updated_at)
      VALUES (${testBusinessId}, 'Test Business LLC', 'Technology', ${testTenantId}, ${testUserId}, 'LLC', 2020, 'Test business for API testing', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Test business created/exists');

    // Create test application
    await sql`
      INSERT INTO applications (id, user_id, business_id, tenant_id, status, stage, use_of_funds, requested_amount, created_at, updated_at)
      VALUES (${testApplicationId}, ${testUserId}, ${testBusinessId}, ${testTenantId}, 'draft', 'New', 'Business expansion and inventory', 250000, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Test application created/exists');

    console.log('\n📋 Test Data Summary:');
    console.log(`User ID: ${testUserId}`);
    console.log(`Business ID: ${testBusinessId}`);
    console.log(`Application ID: ${testApplicationId}`);
    console.log(`Tenant ID: ${testTenantId}`);
    
    console.log('\n🎯 Ready for testing!');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

// Run the function
createTestApplicationData()
  .then(() => {
    console.log('\n✅ Test application data setup complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });