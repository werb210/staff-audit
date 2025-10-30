import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema';
export async function getUserById(id) {
    try {
        const results = await db.select().from(users).where(eq(users.id, id));
        return results[0] || null;
    }
    catch (error) {
        console.error('Error fetching user by ID:', error);
        return null;
    }
}
export async function getUserByEmail(email) {
    try {
        const results = await db.select().from(users).where(eq(users.email, email));
        return results[0] || null;
    }
    catch (error) {
        console.error('Error fetching user by email:', error);
        return null;
    }
}
