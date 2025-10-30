import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });

// First check what columns exist in users table
const tableInfo = await pool.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'users' 
  ORDER BY ordinal_position;
`);

console.log("Current users table structure:", tableInfo.rows.map(r => `${r.column_name}: ${r.data_type}`).join(', '));

// Create phone_e164 column if it doesn't exist
const phoneColumnExists = tableInfo.rows.some(r => r.column_name === 'phone_e164');
if (!phoneColumnExists) {
  await pool.query(`ALTER TABLE users ADD COLUMN phone_e164 TEXT UNIQUE;`);
  console.log("✅ Added phone_e164 column to users table");
}

// Ensure roles column exists as array
const rolesColumnExists = tableInfo.rows.some(r => r.column_name === 'roles');
if (!rolesColumnExists) {
  await pool.query(`ALTER TABLE users ADD COLUMN roles TEXT[] DEFAULT ARRAY['user'];`);
  console.log("✅ Added roles column to users table");
}

const phone = '+15878881837';
const name = 'Todd Werboweski';
const roles = ['admin'];

// Check if Todd already exists by phone or email  
const existing = await pool.query(`
  SELECT id, roles, email, first_name, last_name
  FROM users 
  WHERE phone_e164 = $1 OR email LIKE '%todd%' OR first_name LIKE '%Todd%'
  LIMIT 1
`, [phone]);

if(existing.rows.length > 0){
  const user = existing.rows[0];
  const currentRoles = user.roles || [];
  const hasAdmin = currentRoles.includes('admin');
  
  if(!hasAdmin){
    await pool.query(`
      UPDATE users 
      SET roles = $2, first_name = $3, last_name = $4, phone_e164 = $5, updatedAt = now() 
      WHERE id = $1
    `, [user.id, roles, 'Todd', 'Werboweski', phone]);
    console.log("✅ Updated existing user to admin:", phone, "User ID:", user.id);
  } else {
    // Update phone if missing
    if (!user.phone_e164) {
      await pool.query("UPDATE users SET phone_e164 = $2 WHERE id = $1", [user.id, phone]);
    }
    console.log("✅ Admin already exists:", phone);
  }
} else {
  // Create new admin user
  const result = await pool.query(`
    INSERT INTO users (first_name, last_name, phone_e164, roles, email) 
    VALUES ($1, $2, $3, $4, $5) 
    RETURNING id
  `, ['Todd', 'Werboweski', phone, roles, 'todd@borealfinancial.com']);
  
  console.log("✅ Seeded new admin:", phone, "User ID:", result.rows[0].id);
}

await pool.end();