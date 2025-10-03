/**
 * Create Admin User for Development
 * Creates the admin@boreal.com user with password "admin123" for development mode prefilling
 */

import { db } from './server/db.js';
import { users } from './shared/schema.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function createAdminUser() {
  console.log('🔧 Creating admin user for development...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@boreal.com')).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists');
      console.log('Email: admin@boreal.com');
      console.log('Password: [ENVIRONMENT VARIABLE REQUIRED]');
      return;
    }
    
    // Get password from environment variable or fail
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('❌ ADMIN_PASSWORD environment variable is required');
      console.error('Set ADMIN_PASSWORD in your environment before running this script');
      process.exit(1);
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    
    // Create admin user
    const [newAdmin] = await db.insert(users).values({
      email: 'admin@boreal.com',
      passwordHash,
      phone: '+15551234567', // Mock phone for development
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isVerified: true, // Skip OTP verification for development
      otpCode: null,
      otpExpires: null
    }).returning();
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@boreal.com');
    console.log('Password: [SECURE - SET VIA ENVIRONMENT]');
    console.log('Role: admin');
    console.log('User ID:', newAdmin.id);
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdminUser();