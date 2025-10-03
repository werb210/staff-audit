import express from 'express';
import { db } from '../../db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

router.post('/save', async (req: any, res: any) => {
  const { id, email, role } = req.body;
  
  try {
    // Check for duplicate email (simplified logic)
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));
    
    // If creating a new user (no id), any existing email is a conflict
    // If editing existing user (with id), conflict only if another user has this email
    const hasEmailConflict = id 
      ? existingUsers.some(user => user.id !== id)  // Editing: conflict if another user has this email
      : existingUsers.length > 0;                   // Creating: conflict if any user has this email
    
    if (hasEmailConflict) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Update or create user
    if (id) {
      // Update existing user
      await db
        .update(users)
        .set({ 
          email: email.toLowerCase().trim(),
          role: role,
          updatedAt: new Date()
        })
        .where(eq(users.id, id));
    } else {
      // Create new user (would need more fields in practice)
      await db
        .insert(users)
        .values({ 
          email: email.toLowerCase().trim(),
          role: role,
          firstName: 'New',
          lastName: 'User',
          mobilePhone: '+1000000000' // Placeholder - should be provided
        });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('User save error:', err);
    
    // Handle unique constraint violations from database level
    if (err.code === '23505' && err.constraint === 'users_email_unique') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to save user' });
  }
});

export default router;