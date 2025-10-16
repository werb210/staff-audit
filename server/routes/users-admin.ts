// server/routes/users-admin.ts - Admin User Creation
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users, insertUserSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Create Admin User endpoint
router.post('/create-admin', async (req: any, res: any) => {
  try {
    const { email, password, role = 'admin' } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await db.insert(users).values({
      email,
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      mobilePhone: '+1234567890', // Default for admin
      role: role as 'admin' | 'staff' | 'marketing' | 'lender' | 'referrer',
      isActive: true
    }).returning();

    console.log(`✅ [USER-CREATE] Admin user created: ${email} with role: ${role}`);

    res.json({ 
      success: true, 
      userId: newUser[0].id,
      email: newUser[0].email,
      role: newUser[0].role
    });
  } catch (error: unknown) {
    console.error('❌ [USER-CREATE] Failed to create admin user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Verify Admin endpoint (for testing)
router.post('/verify-admin', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(password, user[0].passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ 
      success: true,
      user: {
        id: user[0].id,
        email: user[0].email,
        role: user[0].role
      }
    });
  } catch (error: unknown) {
    console.error('❌ [USER-VERIFY] Failed to verify admin user:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

export default router;