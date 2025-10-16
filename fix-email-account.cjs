/**
 * Fix Email Account Issue - Create Default Email Account
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createDefaultEmailAccount() {
  console.log('📧 Creating default email account...');
  
  try {
    // Create a default email account for testing
    await pool.query(`
      INSERT INTO email_accounts (
        user_id, email, provider, display_name, is_active, sync_status
      ) VALUES (
        'admin', 'admin@boreal.com', 'imap', 'Admin Email Account', true, 'success'
      ) ON CONFLICT (email) DO NOTHING
    `);
    
    console.log('✅ Default email account created successfully');
    
    // Verify
    const result = await pool.query('SELECT COUNT(*) FROM email_accounts');
    console.log(`📊 Total email accounts: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating email account:', error);
  } finally {
    await pool.end();
  }
}

createDefaultEmailAccount();
