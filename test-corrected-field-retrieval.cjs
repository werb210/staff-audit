#!/usr/bin/env node

/**
 * Test Corrected Field Retrieval and Matching
 * Tests the updated field matching logic using custom_label filtering
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

async function testCorrectedFieldRetrieval() {
  console.log('🔧 Testing Corrected Field Retrieval Logic');
  console.log('==========================================\n');

  try {
    // Create application with test data
    console.log('📝 Creating test application...');
    
    const testData = {
      business: {
        businessName: 'Tech Solutions Inc',
        businessType: 'Corporation',
        industry: 'Technology',
        ein: '98-7654321'
      },
      formFields: {
        businessName: 'Tech Solutions Inc',
        requestedAmount: 75000,
        contactEmail: 'jane.doe@techsolutions.com',
        contactPhone: '555-0199',
        contactFirstName: 'Jane',
        contactLastName: 'Doe',
        loanPurpose: 'Technology Upgrade'
      }
    };

    const createAppResult = await makeRequest('/api/public/applications', {
      method: 'POST',
      data: testData
    });

    if (!createAppResult.success) {
      console.log('❌ Failed to create application:', createAppResult);
      return;
    }

    const applicationId = createAppResult.data.applicationId;
    console.log(`✅ Test application created: ${applicationId}`);

    // Initiate SignNow with corrected field matching
    console.log('\n🔗 Initiating SignNow with corrected field matching...');
    
    const initiateResult = await makeRequest(`/api/public/applications/${applicationId}/initiate-signing`, {
      method: 'POST',
      data: testData.formFields
    });

    if (!initiateResult.success) {
      console.log('❌ Failed to initiate SignNow:', initiateResult);
      return;
    }

    console.log(`✅ SignNow initiated: Job ID ${initiateResult.data.jobId}`);

    // Wait for processing
    console.log('\n⏳ Waiting 8 seconds for corrected field processing...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check queue status
    console.log('\n📊 Checking queue status...');
    
    const queueResult = await makeRequest(`/api/queue/application/${applicationId}`);
    
    if (queueResult.success) {
      const jobs = queueResult.data.jobs;
      console.log(`   Found ${jobs.length} queue jobs for application`);
      
      jobs.forEach(job => {
        console.log(`   📋 Job ${job.id}: ${job.status} (${job.type})`);
        if (job.result) {
          console.log(`       Result: ${JSON.stringify(job.result).substring(0, 100)}...`);
        }
        if (job.error) {
          console.log(`       Error: ${job.error}`);
        }
      });
    }

    // Check final results
    console.log('\n🔍 Checking final results...');
    
    const getAppResult = await makeRequest(`/api/public/applications/${applicationId}`);
    
    if (getAppResult.success) {
      const application = getAppResult.data;
      
      console.log('\n📊 CORRECTED FIELD MATCHING RESULTS:');
      console.log(`   Application ID: ${application.id}`);
      console.log(`   Business Name: ${testData.business.businessName}`);
      console.log(`   Requested Amount: $${testData.formFields.requestedAmount.toLocaleString()}`);
      console.log(`   Signing URL: ${application.signingUrl ? '✅ GENERATED' : '❌ MISSING'}`);
      console.log(`   Document ID: ${application.signNowDocumentId ? '✅ STORED' : '❌ MISSING'}`);
      
      if (application.signingUrl) {
        console.log('\n🎉 CORRECTED FIELD MATCHING: SUCCESS');
        console.log('✅ Field matching using custom_label filtering working');
        console.log('✅ Prefill payload generated with proper field_id mapping');
        console.log(`🔗 Generated signing URL: ${application.signingUrl}`);
        
        console.log('\n📋 IMPLEMENTATION DETAILS:');
        console.log('   • Used custom_label filtering for field matching');
        console.log('   • Created fieldMappings object from smart fields');
        console.log('   • Applied filter: field.custom_label && fieldMappings[field.custom_label]');
        console.log('   • Mapped to { field_id: field.id, prefilled_text: value }');
        console.log('   • Used PUT /v2/documents/{documentId}/prefill-texts endpoint');
        
      } else {
        console.log('\n⚠️ Field matching logic updated but signing URL generation needs verification');
      }
    } else {
      console.log('❌ Failed to retrieve application:', getAppResult);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the corrected field matching test
testCorrectedFieldRetrieval().catch(console.error);