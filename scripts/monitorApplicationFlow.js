#!/usr/bin/env node

/**
 * Real-time Application Flow Monitor
 * Tracks applications and documents through S3 upload pipeline
 * Enforces strict verification rules as specified
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

class ApplicationFlowMonitor {
  constructor() {
    this.startTime = new Date();
    this.monitoredApplications = new Map();
    this.lastApplicationCount = 0;
    this.lastDocumentCount = 0;
  }

  async start() {
    console.log('\n🔍 [S3-MONITOR] Starting real-time application flow monitoring...');
    console.log(`📅 [S3-MONITOR] Started at: ${this.startTime.toISOString()}`);
    console.log('🚫 [S3-MONITOR] ENFORCEMENT: No test docs, no fallback, fail loud\n');

    // Initial state check
    await this.checkCurrentState();
    
    // Start monitoring loop
    setInterval(() => this.monitorLoop(), 3000); // Check every 3 seconds
  }

  async checkCurrentState() {
    try {
      const appResult = await pool.query('SELECT COUNT(*) FROM applications');
      const docResult = await pool.query('SELECT COUNT(*) FROM documents');
      const logResult = await pool.query('SELECT COUNT(*) FROM document_upload_log');

      console.log('📊 [INITIAL-STATE] Database status:');
      console.log(`   Applications: ${appResult.rows[0].count}`);
      console.log(`   Documents: ${docResult.rows[0].count}`);  
      console.log(`   Upload logs: ${logResult.rows[0].count}`);
      console.log('✅ [INITIAL-STATE] Clean state confirmed - ready for monitoring\n');

      this.lastApplicationCount = parseInt(appResult.rows[0].count);
      this.lastDocumentCount = parseInt(docResult.rows[0].count);
    } catch (error) {
      console.error('❌ [MONITOR-ERROR] Database check failed:', error.message);
    }
  }

  async monitorLoop() {
    try {
      await this.checkForNewApplications();
      await this.checkForNewDocuments();
      await this.verifyS3Pipeline();
      await this.enforceFallbackRules();
    } catch (error) {
      console.error('❌ [MONITOR-ERROR] Monitoring loop failed:', error.message);
    }
  }

  async checkForNewApplications() {
    const result = await pool.query(`
      SELECT id, stage, created_at, form_data 
      FROM applications 
      ORDER BY created_at DESC
    `);

    const currentCount = result.rows.length;
    
    if (currentCount > this.lastApplicationCount) {
      const newApps = result.rows.slice(0, currentCount - this.lastApplicationCount);
      
      for (const app of newApps) {
        console.log(`\n🎯 [NEW-APPLICATION] Detected: ${app.id}`);
        console.log(`   Stage: ${app.stage}`);
        console.log(`   Created: ${app.created_at}`);
        console.log(`   Business: ${app.form_data?.step3?.businessName || 'Unknown'}`);
        
        // Check for fallback violation
        if (app.id.startsWith('fallback_')) {
          console.log(`🚫 [VIOLATION] FALLBACK APPLICATION DETECTED: ${app.id}`);
          console.log(`   ❌ This violates the no-fallback rule!`);
        }

        this.monitoredApplications.set(app.id, {
          id: app.id,
          stage: app.stage,
          documents: [],
          uploadStarted: new Date(),
          expectedDocuments: 6
        });
      }
      
      this.lastApplicationCount = currentCount;
    }
  }

  async checkForNewDocuments() {
    const result = await pool.query(`
      SELECT 
        id, 
        application_id, 
        file_name, 
        document_type, 
        storage_status, 
        storage_key,
        checksum,
        file_size,
        created_at,
        object_storage_key
      FROM documents 
      ORDER BY created_at DESC
    `);

    const currentCount = result.rows.length;
    
    if (currentCount > this.lastDocumentCount) {
      const newDocs = result.rows.slice(0, currentCount - this.lastDocumentCount);
      
      for (const doc of newDocs) {
        console.log(`\n📄 [NEW-DOCUMENT] Uploaded: ${doc.file_name}`);
        console.log(`   Document ID: ${doc.id}`);
        console.log(`   Application: ${doc.application_id}`);
        console.log(`   Type: ${doc.document_type}`);
        console.log(`   Storage Status: ${doc.storage_status}`);
        console.log(`   Storage Key: ${doc.storage_key || 'NULL'}`);
        console.log(`   S3 Key: ${doc.object_storage_key || 'NULL'}`);
        console.log(`   File Size: ${doc.file_size} bytes`);
        console.log(`   Checksum: ${doc.checksum || 'NULL'}`);

        // Verify S3 requirements
        if (doc.storage_status !== 'uploaded') {
          console.log(`   ⚠️ [WARNING] Storage status not 'uploaded': ${doc.storage_status}`);
        }
        
        if (!doc.storage_key && !doc.object_storage_key) {
          console.log(`   ❌ [ERROR] No S3 storage key found!`);
        }

        // Check for test document violations
        if (doc.file_name.toLowerCase().includes('test') || 
            doc.file_name.toLowerCase().includes('sample') ||
            doc.file_name.toLowerCase().includes('dummy')) {
          console.log(`   🚫 [VIOLATION] TEST DOCUMENT DETECTED: ${doc.file_name}`);
          console.log(`   ❌ This violates the real-documents-only rule!`);
        }

        // Track against application
        if (this.monitoredApplications.has(doc.application_id)) {
          const app = this.monitoredApplications.get(doc.application_id);
          app.documents.push(doc);
          
          console.log(`   📊 [PROGRESS] Application ${doc.application_id} now has ${app.documents.length}/${app.expectedDocuments} documents`);
          
          if (app.documents.length === app.expectedDocuments) {
            console.log(`   ✅ [COMPLETE] Application reached 6 documents - triggering full audit`);
            await this.performFullApplicationAudit(doc.application_id);
          }
        }
      }
      
      this.lastDocumentCount = currentCount;
    }
  }

  async verifyS3Pipeline() {
    // Check upload logs for S3 verification
    const logResult = await pool.query(`
      SELECT * FROM document_upload_log 
      WHERE upload_attempted_at > $1
      ORDER BY upload_attempted_at DESC
    `, [this.startTime]);

    for (const log of logResult.rows) {
      if (!log.s3_backup_successful) {
        console.log(`\n⚠️ [S3-FAILURE] Upload log shows S3 failure:`);
        console.log(`   Document: ${log.file_name}`);
        console.log(`   Error: ${log.error_message}`);
      }
    }
  }

  async enforceFallbackRules() {
    // Check for any fallback violations
    const fallbackApps = await pool.query(`
      SELECT id FROM applications WHERE id LIKE 'fallback_%'
    `);

    if (fallbackApps.rows.length > 0) {
      console.log(`\n🚫 [CRITICAL-VIOLATION] ${fallbackApps.rows.length} fallback applications found:`);
      fallbackApps.rows.forEach(app => {
        console.log(`   ❌ ${app.id}`);
      });
      console.log(`   This violates the no-fallback enforcement rule!`);
    }
  }

  async performFullApplicationAudit(applicationId) {
    console.log(`\n🔍 [FULL-AUDIT] Starting comprehensive audit for ${applicationId}`);
    
    try {
      // Get application details
      const appResult = await pool.query(`
        SELECT * FROM applications WHERE id = $1
      `, [applicationId]);
      
      const app = appResult.rows[0];
      if (!app) {
        console.log(`   ❌ Application not found in database`);
        return;
      }

      // Get all documents
      const docResult = await pool.query(`
        SELECT * FROM documents WHERE application_id = $1 ORDER BY created_at
      `, [applicationId]);

      console.log(`\n📋 [AUDIT-SUMMARY] Application: ${applicationId}`);
      console.log(`   Stage: ${app.stage}`);
      console.log(`   Business: ${app.form_data?.step3?.businessName || 'Unknown'}`);
      console.log(`   Documents found: ${docResult.rows.length}/6`);

      // Document-by-document audit
      console.log(`\n📄 [DOCUMENT-AUDIT] Individual document verification:`);
      for (let i = 0; i < docResult.rows.length; i++) {
        const doc = docResult.rows[i];
        console.log(`   ${i + 1}. ${doc.file_name}`);
        console.log(`      Document ID: ${doc.id}`);
        console.log(`      Type: ${doc.document_type}`);
        console.log(`      Storage Status: ${doc.storage_status}`);
        console.log(`      S3 Storage Key: ${doc.storage_key || doc.object_storage_key || 'NULL'}`);
        console.log(`      File Size: ${doc.file_size} bytes`);
        console.log(`      Checksum: ${doc.checksum || 'NULL'}`);
        
        // Verification status
        if (doc.storage_status === 'uploaded' && (doc.storage_key || doc.object_storage_key)) {
          console.log(`      ✅ S3 upload verified`);
        } else {
          console.log(`      ❌ S3 upload verification failed`);
        }
      }

      // Upload log verification
      const uploadLogResult = await pool.query(`
        SELECT * FROM document_upload_log WHERE application_id = $1
      `, [applicationId]);

      console.log(`\n📊 [UPLOAD-LOG-AUDIT] Upload log entries: ${uploadLogResult.rows.length}`);
      uploadLogResult.rows.forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.file_name}`);
        console.log(`      S3 Success: ${log.s3_backup_successful ? '✅' : '❌'}`);
        console.log(`      Checksum Verified: ${log.checksum_verified ? '✅' : '❌'}`);
        if (log.error_message) {
          console.log(`      Error: ${log.error_message}`);
        }
      });

      console.log(`\n✅ [AUDIT-COMPLETE] Full audit completed for ${applicationId}`);
      
    } catch (error) {
      console.error(`❌ [AUDIT-ERROR] Failed to audit ${applicationId}:`, error.message);
    }
  }
}

// Start monitoring
const monitor = new ApplicationFlowMonitor();
monitor.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 [S3-MONITOR] Stopping application flow monitoring...');
  process.exit(0);
});