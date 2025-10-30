import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    phone_e164 TEXT UNIQUE NOT NULL,
    email TEXT,
    roles TEXT[] NOT NULL DEFAULT ARRAY['user'],
    tenant_id UUID,
    createdAt TIMESTAMPTZ DEFAULT now(),
    updatedAt TIMESTAMPTZ DEFAULT now()
  );
`);

const phone = '+15878881837';
const name = 'Todd Werboweski';
const roles = ['admin'];
const q = await pool.query("SELECT id,roles FROM users WHERE phone_e164=$1",[phone]);

if(q.rows.length){
  const row=q.rows[0];
  const haveAdmin = (row.roles||[]).includes('admin');
  if(!haveAdmin){
    await pool.query("UPDATE users SET roles=$2, full_name=$3, updatedAt=now() WHERE phone_e164=$1",[phone,roles,name]);
    console.log("✅ Updated existing user to admin:", phone);
  } else {
    console.log("✅ Admin exists:", phone);
  }
}else{
  await pool.query("INSERT INTO users (full_name, phone_e164, roles) VALUES ($1,$2,$3)",[name,phone,roles]);
  console.log("✅ Seeded admin:", phone);
}

await pool.end();