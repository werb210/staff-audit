#!/usr/bin/env node

/**
 * Quick Database Persistence Test
 * Tests if signing URLs are being properly stored in database
 */

const http = require('http');

const baseUrl = 'http://localhost:5000';

function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            success: false,
            error: 'Invalid JSON response',
            rawData: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }

    req.end();
  });
}

async function testDatabasePersistence() {
  console.log('🔍 Quick Database Persistence Test');
  console.log('====================================\n');

  try {
    // Create a simple application
    console.log('📝 Creating test application...');
    
    const createAppResult = await makeRequest('/api/public/applications', {
      method: 'POST',
      data: {
        business: {
          businessName: 'Database Test Corp'
        },
        formFields: {
          businessName: 'Database Test Corp',
          requestedAmount: 50000
        }
      }
    });

    if (!createAppResult.success) {
      console.log('❌ Failed to create application:', createAppResult);
      return;
    }

    const applicationId = createAppResult.data.applicationId;
    console.log(`✅ Application created: ${applicationId}`);

    // Initiate SignNow
    console.log('\n🔗 Initiating SignNow...');
    
    const initiateResult = await makeRequest(`/api/public/applications/${applicationId}/initiate-signing`, {
      method: 'POST',
      data: {
        businessName: 'Database Test Corp',
        contactEmail: 'test@example.com',
        requestedAmount: 50000
      }
    });

    if (!initiateResult.success) {
      console.log('❌ Failed to initiate SignNow:', initiateResult);
      return;
    }

    console.log(`✅ SignNow initiated: Job ID ${initiateResult.data.jobId}`);

    // Wait for processing
    console.log('\n⏳ Waiting 8 seconds for queue processing...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check if signing URL was stored
    console.log('\n🔍 Checking database persistence...');
    
    const getAppResult = await makeRequest(`/api/public/applications/${applicationId}`);
    
    if (getAppResult.success) {
      const application = getAppResult.data;
      
      console.log('\n📊 APPLICATION STATUS:');
      console.log(`   Application ID: ${application.id}`);
      console.log(`   Signing URL: ${application.signingUrl || 'NOT SET'}`);
      console.log(`   Document ID: ${application.signNowDocumentId || 'NOT SET'}`);
      console.log(`   Status: ${application.status}`);
      
      if (application.signingUrl && application.signNowDocumentId) {
        console.log('\n✅ DATABASE PERSISTENCE: 100% OPERATIONAL');
        console.log('🎉 Signing URL successfully stored in database!');
        console.log(`🔗 Working signing URL: ${application.signingUrl}`);
      } else {
        console.log('\n❌ DATABASE PERSISTENCE: INCOMPLETE');
        console.log('🔧 Signing URL or Document ID missing from database');
      }
    } else {
      console.log('❌ Failed to retrieve application:', getAppResult);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testDatabasePersistence().catch(console.error);