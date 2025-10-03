import { db } from './drizzle';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export async function ensureAdmin() {
  const email = 'todd.w@boreal.financial';
  const phone = '+15878881837';
  const firstName = 'Todd';
  const lastName = 'Werboweski';

  const found = await db.select().from(users).where(eq(users.email, email));
  if (found.length === 0) {
    await db.insert(users).values({ 
      email, 
      phone, 
      role: 'admin', 
      first_name: firstName,
      last_name: lastName,
      is_active: true,
      password_hash: "unused"
    });
    console.log('[SEED] Admin user created');
  } else if (found[0].role !== 'admin') {
    await db.update(users).set({ role:'admin' }).where(eq(users.id, found[0].id));
    console.log('[SEED] Admin role restored for', found[0].email);
  } else {
    console.log('[SEED] Admin user OK');
  }
}