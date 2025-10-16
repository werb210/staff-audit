#!/usr/bin/env node

/**
 * Test Enhanced Logging Format
 * Quick test to verify the new logging format
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

async function testEnhancedLogging() {
  console.log('🔍 Testing Enhanced SignNow Logging Format');
  console.log('==========================================\n');

  try {
    // Create test application
    const testData = {
      business: {
        businessName: 'Enhanced Logging Test Corp',
        businessType: 'LLC',
        industry: 'Software Development',
        ein: '45-1234567'
      },
      formFields: {
        businessName: 'Enhanced Logging Test Corp',
        requestedAmount: 125000,
        contactEmail: 'test@enhanced-logging.com',
        contactPhone: '555-0123',
        contactFirstName: 'Enhanced',
        contactLastName: 'Logger',
        loanPurpose: 'Enhanced System Testing'
      }
    };

    console.log('📝 Creating test application for enhanced logging...');
    
    const createResult = await makeRequest('/api/public/applications', {
      method: 'POST',
      data: testData
    });

    if (!createResult.success) {
      console.log('❌ Failed to create application:', createResult);
      return;
    }

    const applicationId = createResult.data.applicationId;
    console.log(`✅ Test application created: ${applicationId}`);

    // Initiate SignNow to test enhanced logging
    console.log('\n🔗 Initiating SignNow to test enhanced logging format...');
    
    const initiateResult = await makeRequest(`/api/public/applications/${applicationId}/initiate-signing`, {
      method: 'POST',
      data: testData.formFields
    });

    if (initiateResult.success) {
      console.log(`✅ SignNow initiated successfully`);
      console.log('📋 Check the server logs above for the enhanced logging format:');
      console.log('   Expected format: [SignNow] Prefilled X fields');
      console.log('   Expected format: → field_id = field_value');
    } else {
      console.log('❌ SignNow initiation failed:', initiateResult);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the enhanced logging test
testEnhancedLogging().catch(console.error);