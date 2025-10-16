/**
 * Fix Admin User Phone Number for SMS OTP
 * Updates the admin user with a valid phone number for authentication
 */

import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function fixAdminUser() {
  console.log('🔧 Fixing Admin User for SMS OTP Authentication...');

  try {
    // Check if admin user exists
    const [existingAdmin] = await db.select().from(users).where(eq(users.email, 'admin@boreal.com'));
    
    if (existingAdmin) {
      console.log('✅ Admin user found, updating phone number...');
      
      // Update existing admin with valid phone number
      await db.update(users)
        .set({ 
          phone: '+15878881837', // Valid test phone number
          otpVerified: true // Mark as verified for immediate login
        })
        .where(eq(users.id, existingAdmin.id));
        
      console.log('✅ Admin user updated with valid phone number');
    } else {
      console.log('⚠️ Admin user not found, creating new admin...');
      
      // Create new admin user
      const passwordHash = await bcrypt.hash('admin123', 12);
      
      await db.insert(users).values({
        id: '5cfef28a-b9f2-4bc3-8f18-05521058890e',
        email: 'admin@boreal.com',
        passwordHash,
        phone: '+15878881837',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        otpVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ New admin user created');
    }

    console.log('\n📊 Admin User Status:');
    console.log('Email: admin@boreal.com');
    console.log('Password: admin123');
    console.log('Phone: +1 587 888 1837');
    console.log('Role: admin');
    console.log('OTP Verified: true');
    
    console.log('\n🎉 Admin user ready for SMS OTP authentication!');
    
  } catch (error) {
    console.error('❌ Failed to fix admin user:', error);
    process.exit(1);
  }
}

fixAdminUser();