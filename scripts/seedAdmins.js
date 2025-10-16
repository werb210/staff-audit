/**
 * Seed Admin Users for RBAC System
 * Creates 3 admin accounts with secure password hashing
 */

import bcrypt from 'bcryptjs';
import { db } from '../server/db.ts';
import { users } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

async function seedAdmins() {
  console.log('🌱 Seeding admin users...');
  
  try {
    // Use environment variable for admin password or fail-safe fallback
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('ADMIN_PASSWORD environment variable is required for security');
    }
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    const adminEmails = [
      'todd.w@canadianbusinessfinancing.com',
      'andrew.p@boreal.financial', 
      'caden.w@canadianbusinessfinancing.com'
    ];

    // Default tenant ID (using the existing default from the system)
    const defaultTenantId = '00000000-0000-0000-0000-000000000000';
    
    for (const email of adminEmails) {
      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (existingUser.length === 0) {
        // Create new admin user
        const [newUser] = await db.insert(users).values({
          username: email.split('@')[0], // Use email prefix as username
          email: email,
          passwordHash: passwordHash,
          phone: '+15878881837', // Default phone number for admin users
          role: 'admin',
          firstName: email.split('.')[0], // Extract first name from email
          lastName: email.split('.')[1]?.split('@')[0] || 'Admin',
          isActive: true,
          isEmailVerified: true,
          tenantId: defaultTenantId,
          department: 'Administration'
        }).returning();
        
        console.log(`✅ Created admin user: ${email}`);
      } else {
        console.log(`⚠️  Admin user already exists: ${email}`);
      }
    }
    
    console.log('🎉 Admin seeding completed successfully');
    
  } catch (error) {
    console.error('❌ Error seeding admin users:', error);
    throw error;
  }
}

// Run the seed function
seedAdmins()
  .then(() => {
    console.log('✨ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });