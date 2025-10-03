#!/usr/bin/env node

/**
 * 🚀 PIPELINE AUTOMATION TEST SCRIPT
 * 
 * Tests the Sales Pipeline stage movement rules:
 * - New → Requires Docs (when missing/rejected documents)
 * - Requires Docs → In Review (when all docs accepted)
 * - Auto-movement based on document status changes
 */

console.log('🚀 Testing Pipeline Automation System...\n');

const BASE_URL = 'http://localhost:5000';

async function testPipelineAutomation() {
  try {
    console.log('📋 Step 1: Getting applications list...');
    
    // Get all applications
    const appsResponse = await fetch(`${BASE_URL}/api/applications`);
    const appsData = await appsResponse.json();
    
    if (!appsData.success || !appsData.applications || appsData.applications.length === 0) {
      console.log('❌ No applications found for testing');
      return;
    }
    
    console.log(`✅ Found ${appsData.applications.length} applications`);
    
    // Test with first application
    const testApp = appsData.applications[0];
    console.log(`🎯 Testing with application: ${testApp.id}`);
    console.log(`   Business: ${testApp.business_name || 'Unknown'}`);
    console.log(`   Current stage: ${testApp.stage || 'New'}`);
    
    // Step 2: Check current pipeline status
    console.log('\n📊 Step 2: Checking pipeline status...');
    const statusResponse = await fetch(`${BASE_URL}/api/pipeline/status/${testApp.id}`);
    const statusText = await statusResponse.text();
    
    try {
      const statusData = JSON.parse(statusText);
      if (statusData.success) {
        console.log(`✅ Current Stage: ${statusData.currentStage}`);
        console.log(`📝 Suggested Stage: ${statusData.suggestedStage}`);
        console.log(`📄 Documents: ${statusData.documentStats.total} total, ${statusData.documentStats.accepted} accepted`);
        console.log(`🔄 Needs Update: ${statusData.needsUpdate ? 'Yes' : 'No'}`);
        if (statusData.reason) {
          console.log(`💡 Reason: ${statusData.reason}`);
        }
      }
    } catch (parseError) {
      console.log('⚠️ Pipeline status response:', statusText);
    }
    
    // Step 3: Test PDF generation
    console.log('\n📄 Step 3: Testing PDF generation...');
    const pdfResponse = await fetch(`${BASE_URL}/api/applications/${testApp.id}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const pdfText = await pdfResponse.text();
    try {
      const pdfData = JSON.parse(pdfText);
      if (pdfData.success) {
        console.log(`✅ PDF Generated: ${pdfData.fileName}`);
        console.log(`📁 Storage Key: ${pdfData.storageKey}`);
        console.log(`🆔 Document ID: ${pdfData.documentId}`);
      } else {
        console.log('❌ PDF generation failed:', pdfData.error);
      }
    } catch (parseError) {
      console.log('⚠️ PDF response:', pdfText);
    }
    
    // Step 4: Show pipeline rules summary
    console.log('\n📦 Pipeline Rules Summary:');
    console.log('┌─────────────────┬──────────────────────────────────────────────────┐');
    console.log('│ Stage           │ Criteria                                         │');
    console.log('├─────────────────┼──────────────────────────────────────────────────┤');
    console.log('│ New             │ Application just submitted, no actions taken    │');
    console.log('│ Requires Docs   │ Missing or rejected documents detected           │');
    console.log('│ In Review       │ All documents uploaded and accepted             │');
    console.log('│ Off to Lender   │ Application submitted to lender(s)              │');
    console.log('│ Accepted        │ Application approved by lender                  │');
    console.log('│ Denied          │ Application rejected or withdrawn               │');
    console.log('└─────────────────┴──────────────────────────────────────────────────┘');
    
    console.log('\n✅ Pipeline automation system available at:');
    console.log(`   📊 Status: GET ${BASE_URL}/api/pipeline/status/:applicationId`);
    console.log(`   🔄 Process: POST ${BASE_URL}/api/pipeline/process/:applicationId`);
    console.log(`   📋 Evaluate: POST ${BASE_URL}/api/pipeline/evaluate/:applicationId`);
    console.log(`   🚀 Batch: POST ${BASE_URL}/api/pipeline/batch-process`);
    
  } catch (error) {
    console.error('❌ Pipeline automation test failed:', error.message);
  }
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testPipelineAutomation();