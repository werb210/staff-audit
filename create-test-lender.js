/**
 * Create Test Lender User for Portal Testing
 * Creates a lender user account for testing the lender portal functionality
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { eq } = require('drizzle-orm');

// Import schema from the server directory where it's properly compiled
const schema = require('./server/storage.ts');

async function createTestLender() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client, { schema });

  try {
    console.log('🔍 Checking existing users...');
    
    // Check if lender user already exists
    const existingLender = await db.query.users.findFirst({
      where: eq(schema.users.email, 'lender@test.com')
    });

    if (existingLender) {
      console.log('✅ Test lender already exists: lender@test.com');
      console.log('   Password: lender123');
      console.log('   Role:', existingLender.role);
      return;
    }

    // Create new lender user
    const hashedPassword = await bcrypt.hash('lender123', 10);
    
    const newLender = await db.insert(schema.users).values({
      id: '99999999-9999-9999-9999-999999999999',
      email: 'lender@test.com',
      passwordHash: hashedPassword,
      role: 'lender',
      firstName: 'Test',
      lastName: 'Lender',
      tenantId: '00000000-0000-0000-0000-000000000000',
      isVerified: true,
      otpVerified: true
    }).returning();

    console.log('✅ Test lender user created successfully!');
    console.log('📧 Email: lender@test.com');
    console.log('🔑 Password: lender123');
    console.log('👤 Role: lender');
    console.log('');
    console.log('🔗 You can now log in with these credentials to test the lender portal');

  } catch (error) {
    console.error('❌ Error creating test lender:', error.message);
  } finally {
    await client.end();
  }
}

createTestLender();