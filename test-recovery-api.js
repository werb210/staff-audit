#!/usr/bin/env node

/**
 * 🧪 DOCUMENT RECOVERY API TEST
 * Tests the document recovery API to identify missing files
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';
const APPLICATION_ID = 'b735f5c3-b446-47ec-916c-19be96faea3e';

async function testRecoveryAPI() {
  console.log('🔍 Testing Document Recovery API');
  console.log(`📋 Application ID: ${APPLICATION_ID}`);
  
  // Test endpoints to try
  const endpoints = [
    `/api/simple-recovery/application/${APPLICATION_ID}/status`,
    `/api/document-recovery/application/${APPLICATION_ID}/documents`,
    `/api/applications/${APPLICATION_ID}/documents`
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔗 Testing: ${endpoint}`);
    
    try {
      // Try without auth first
      let response = await fetch(`${API_BASE}${endpoint}`);
      let result = await response.text();
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 401 || response.status === 403) {
        console.log('   ❌ Auth required, trying with dev bypass...');
        
        // Try with dev bypass header
        response = await fetch(`${API_BASE}${endpoint}`, {
          headers: { 'x-dev-bypass': 'true' }
        });
        result = await response.text();
        console.log(`   Status with bypass: ${response.status}`);
      }
      
      // Try to parse as JSON
      let jsonResult;
      try {
        jsonResult = JSON.parse(result);
        console.log('   ✅ JSON Response:', JSON.stringify(jsonResult, null, 2));
        
        if (jsonResult.success) {
          console.log(`   📊 Total documents: ${jsonResult.totalDocuments || jsonResult.documents?.length || 0}`);
          console.log(`   ❌ Missing files: ${jsonResult.missingFiles || 0}`);
          console.log(`   ✅ Healthy files: ${jsonResult.healthyFiles || 0}`);
          
          if (jsonResult.documents && jsonResult.documents.length > 0) {
            console.log('   📋 Document details:');
            jsonResult.documents.forEach(doc => {
              const status = doc.needsRecovery ? '❌ MISSING' : '✅ EXISTS';
              console.log(`      ${status} ${doc.fileName || doc.file_name} (${doc.documentType || doc.document_type})`);
            });
          }
        }
        
      } catch (parseError) {
        console.log('   ❌ Not JSON response, first 200 chars:');
        console.log('  ', result.slice(0, 200));
      }
      
    } catch (error) {
      console.log(`   ❌ Request failed:`, error.message);
    }
  }
  
  console.log('\n🎯 Document Recovery API Test Complete');
}

// Run the test
testRecoveryAPI().catch(console.error);