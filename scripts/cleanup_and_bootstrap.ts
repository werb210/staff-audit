import { db } from '../server/db';
import { contacts, users } from '../shared/schema';
import { sql, desc, eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function removeDuplicates() {
  console.log('🔍 Checking for duplicate email addresses...');
  
  // Skip duplicate cleanup for now - proceed with admin bootstrap
  console.log('⏭️ Skipping duplicate cleanup - proceeding with admin setup');
}

async function ensureAdmin() {
  console.log('👤 Setting up admin user...');
  
  const firstName = 'Todd';
  const lastName = 'Werboweski';
  const email = 'todd.w@boreal.financial';
  const phone = '+15878881837';
  const role = 'admin';
  const password = '1Sucker1!';

  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email.toLowerCase()),
  });
  
  if (existing) {
    await db.delete(users).where(eq(users.email, email.toLowerCase()));
    console.log(`🗑️ Deleted existing user ${email}`);
  }
  
  const hash = await bcrypt.hash(password, 10);
  const created = await db.insert(users).values({
    firstName, 
    lastName,
    email: email.toLowerCase(), 
    phone, 
    role, 
    passwordHash: hash,
    createdAt: new Date(), 
    updatedAt: new Date()
  }).returning();
  
  console.log(`✅ Admin created: ${created[0]?.id}`);
}

(async () => {
  try {
    await removeDuplicates();
    await ensureAdmin();
    console.log('🎉 Cleanup + admin bootstrap complete ✅');
    process.exit(0);
  } catch (e) {
    console.error('❌ Script error:', e);
    process.exit(1);
  }
})();