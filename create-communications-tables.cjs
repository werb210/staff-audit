/**
 * Create V2 Communications System Database Tables
 * Comprehensive email, SMS, voice, and OTP communication infrastructure
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createCommunicationsTables() {
  console.log('📧 Creating V2 Communications System Database Tables...');

  try {
    // Create email_accounts table
    console.log('📧 Creating email_accounts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_accounts (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL CHECK (provider IN ('office365', 'exchange', 'outlook', 'gmail', 'imap')),
        display_name TEXT,
        imap_host TEXT,
        imap_port INTEGER,
        smtp_host TEXT,
        smtp_port INTEGER,
        use_ssl BOOLEAN DEFAULT TRUE,
        encrypted_credentials TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        last_sync TIMESTAMP,
        sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create email_messages table
    console.log('📧 Creating email_messages table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_messages (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES email_accounts(id),
        message_id TEXT NOT NULL,
        thread_id TEXT,
        subject TEXT,
        from_address TEXT NOT NULL,
        to_addresses TEXT[],
        cc_addresses TEXT[],
        bcc_addresses TEXT[],
        reply_to TEXT,
        body TEXT,
        body_html TEXT,
        body_text TEXT,
        message_date TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE,
        is_starred BOOLEAN DEFAULT FALSE,
        is_sent BOOLEAN DEFAULT FALSE,
        is_draft BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        has_attachments BOOLEAN DEFAULT FALSE,
        attachment_count INTEGER DEFAULT 0,
        attachment_data JSONB,
        contact_id INTEGER,
        application_id TEXT,
        category TEXT,
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create sms_messages table
    console.log('📱 Creating sms_messages table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id SERIAL PRIMARY KEY,
        message_sid TEXT UNIQUE,
        from_number TEXT NOT NULL,
        to_number TEXT NOT NULL,
        body TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        status TEXT,
        num_segments INTEGER,
        price REAL,
        price_unit TEXT,
        error_code INTEGER,
        error_message TEXT,
        contact_id INTEGER,
        application_id TEXT,
        is_processed BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        is_automated BOOLEAN DEFAULT FALSE,
        automation_type TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create voice_calls table
    console.log('📞 Creating voice_calls table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voice_calls (
        id SERIAL PRIMARY KEY,
        call_sid TEXT UNIQUE,
        from_number TEXT NOT NULL,
        to_number TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        status TEXT,
        duration INTEGER,
        recording_url TEXT,
        recording_sid TEXT,
        recording_duration INTEGER,
        ivr_path TEXT,
        ivr_data JSONB,
        price REAL,
        price_unit TEXT,
        contact_id INTEGER,
        application_id TEXT,
        user_id TEXT,
        notes TEXT,
        call_purpose TEXT,
        outcome TEXT,
        requires_follow_up BOOLEAN DEFAULT FALSE,
        follow_up_date TIMESTAMP,
        follow_up_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create otp_verifications table
    console.log('🔐 Creating otp_verifications table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id SERIAL PRIMARY KEY,
        phone_number TEXT NOT NULL,
        code TEXT NOT NULL,
        purpose TEXT NOT NULL,
        user_id TEXT,
        application_id TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        expires_at TIMESTAMP NOT NULL,
        verified_at TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create communication_templates table
    console.log('📄 Creating communication_templates table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS communication_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'voice')),
        category TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        variables TEXT[],
        is_active BOOLEAN DEFAULT TRUE,
        is_default BOOLEAN DEFAULT FALSE,
        usage_count INTEGER DEFAULT 0,
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create performance indexes
    console.log('📧 Creating performance indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_accounts_email ON email_accounts(email);
      CREATE INDEX IF NOT EXISTS idx_email_messages_account_id ON email_messages(account_id);
      CREATE INDEX IF NOT EXISTS idx_email_messages_message_date ON email_messages(message_date DESC);
      CREATE INDEX IF NOT EXISTS idx_email_messages_application_id ON email_messages(application_id);
      CREATE INDEX IF NOT EXISTS idx_sms_messages_direction ON sms_messages(direction);
      CREATE INDEX IF NOT EXISTS idx_sms_messages_application_id ON sms_messages(application_id);
      CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_voice_calls_direction ON voice_calls(direction);
      CREATE INDEX IF NOT EXISTS idx_voice_calls_application_id ON voice_calls(application_id);
      CREATE INDEX IF NOT EXISTS idx_voice_calls_created_at ON voice_calls(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone_number ON otp_verifications(phone_number);
      CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at);
      CREATE INDEX IF NOT EXISTS idx_communication_templates_type ON communication_templates(type);
      CREATE INDEX IF NOT EXISTS idx_communication_templates_category ON communication_templates(category);
    `);

    // Insert default communication templates
    console.log('📄 Inserting default communication templates...');
    const templates = [
      {
        name: 'Application Submitted',
        type: 'email',
        category: 'application_status',
        subject: 'Application Submitted - {{applicationId}}',
        body: 'Dear {{customerName}},\n\nYour application {{applicationId}} has been successfully submitted. We will review your application and get back to you within 2-3 business days.\n\nThank you for choosing our services.',
        variables: ['customerName', 'applicationId']
      },
      {
        name: 'Application Approved',
        type: 'sms',
        category: 'application_status',
        body: 'Great news! Your application {{applicationId}} has been approved. Please check your email for next steps.',
        variables: ['applicationId']
      },
      {
        name: 'Document Required',
        type: 'email',
        category: 'document_request',
        subject: 'Additional Documents Required - {{applicationId}}',
        body: 'Dear {{customerName}},\n\nTo proceed with your application {{applicationId}}, we need the following documents:\n\n{{documentList}}\n\nPlease upload these documents at your earliest convenience.',
        variables: ['customerName', 'applicationId', 'documentList']
      },
      {
        name: 'Welcome Call Script',
        type: 'voice',
        category: 'welcome',
        body: 'Hello {{customerName}}, thank you for your interest in our lending services. This is a welcome call to discuss your application {{applicationId}} and answer any questions you may have.',
        variables: ['customerName', 'applicationId']
      },
      {
        name: 'OTP Verification',
        type: 'sms',
        category: 'verification',
        body: 'Your verification code is: {{otpCode}}. This code will expire in 10 minutes. Do not share this code with anyone.',
        variables: ['otpCode']
      },
      {
        name: 'Appointment Reminder',
        type: 'sms',
        category: 'reminder',
        body: 'Reminder: You have an appointment scheduled for {{appointmentDate}} at {{appointmentTime}}. Please call us if you need to reschedule.',
        variables: ['appointmentDate', 'appointmentTime']
      }
    ];

    for (const template of templates) {
      await pool.query(`
        INSERT INTO communication_templates (
          name, type, category, subject, body, variables, is_active, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true)
        ON CONFLICT DO NOTHING
      `, [
        template.name,
        template.type,
        template.category,
        template.subject || null,
        template.body,
        template.variables
      ]);
    }

    // Verify table creation
    const tableChecks = await Promise.all([
      pool.query("SELECT COUNT(*) FROM email_accounts"),
      pool.query("SELECT COUNT(*) FROM email_messages"),
      pool.query("SELECT COUNT(*) FROM sms_messages"),
      pool.query("SELECT COUNT(*) FROM voice_calls"),
      pool.query("SELECT COUNT(*) FROM otp_verifications"),
      pool.query("SELECT COUNT(*) FROM communication_templates")
    ]);

    console.log('\n📊 DATABASE SETUP VERIFICATION:');
    console.log(`✅ Email Accounts Table: Created (${tableChecks[0].rows[0].count} accounts)`);
    console.log(`✅ Email Messages Table: Created (${tableChecks[1].rows[0].count} messages)`);
    console.log(`✅ SMS Messages Table: Created (${tableChecks[2].rows[0].count} messages)`);
    console.log(`✅ Voice Calls Table: Created (${tableChecks[3].rows[0].count} calls)`);
    console.log(`✅ OTP Verifications Table: Created (${tableChecks[4].rows[0].count} verifications)`);
    console.log(`✅ Communication Templates Table: Created (${tableChecks[5].rows[0].count} templates)`);
    console.log('✅ Performance indexes: Created and optimized');

    console.log('\n🎯 V2 COMMUNICATIONS SYSTEM - DATABASE READY');
    console.log('=============================================');
    console.log('• Comprehensive communication infrastructure created');
    console.log('• Email, SMS, Voice, and OTP tables initialized');
    console.log('• Default communication templates loaded');
    console.log('• Performance-optimized with proper indexing');
    console.log('• Ready for V2 migration package integration');

  } catch (error) {
    console.error('❌ Error creating communications tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createCommunicationsTables();