/**
 * Fix Admin User OTP Requirements for Development
 * Updates the admin user to skip OTP verification in development
 */

import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixAdminOTP() {
  console.log('Updating admin user to skip OTP verification...');
  
  try {
    // Update admin user to skip OTP verification
    const [updatedAdmin] = await db.update(users)
      .set({
        isVerified: true,
        otpCode: null,
        otpExpires: null,
        phone: '+15551234567' // Valid phone format but won't be used
      })
      .where(eq(users.email, 'admin@boreal.com'))
      .returning();
    
    if (!updatedAdmin) {
      console.log('Admin user not found');
      return;
    }
    
    console.log('Admin user updated successfully');
    console.log('Email: admin@boreal.com');
    console.log('Password: admin123');
    console.log('OTP verification: DISABLED for development');
    console.log('User ID:', updatedAdmin.id);
    
  } catch (error) {
    console.error('Failed to update admin user:', error);
    process.exit(1);
  }
}

fixAdminOTP();