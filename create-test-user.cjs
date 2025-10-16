/**
 * Create Test User for RBAC Authentication
 * Creates the todd.w@boreal.financial user with password "1Sucker1!" for testing
 */

const bcrypt = require('bcryptjs');
const { db } = require('./server/db.ts');
const { users } = require('./shared/schema.ts');
const { eq } = require('drizzle-orm');

async function createTestUser() {
  try {
    console.log('🔐 Creating test user for RBAC authentication...');
    
    const email = 'todd.w@boreal.financial';
    const password = '1Sucker1!';
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      console.log('✅ Test user already exists:', email);
      console.log('   User ID:', existingUser[0].id);
      console.log('   Role:', existingUser[0].role);
      console.log('   Active:', existingUser[0].isActive);
      return existingUser[0];
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create the user
    const newUser = {
      email: email,
      username: email, // Using email as username
      passwordHash: passwordHash,
      firstName: 'Todd',
      lastName: 'Wilson',
      phone: '+15878881837', // Required phone number
      role: 'admin', // Admin role for full access
      isActive: true,
      tenantId: '00000000-0000-0000-0000-000000000000',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [createdUser] = await db.insert(users).values(newUser).returning();
    
    console.log('✅ Successfully created test user:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   User ID:', createdUser.id);
    console.log('   Role:', createdUser.role);
    console.log('   Created at:', createdUser.createdAt);
    
    return createdUser;
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('\n🎉 Test user creation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test user creation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createTestUser };