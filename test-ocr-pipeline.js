#!/usr/bin/env node

/**
 * OCR + Banking Analysis Pipeline Test Script
 * Tests the complete S3 → OCR → Banking Analysis workflow
 */

console.log('🧪 Starting OCR + Banking Analysis Pipeline Test...\n');

const APPLICATION_ID = 'a3e1b626-7588-4e3d-89ed-849e89eaca72';
const BASE_URL = 'http://localhost:5000';

async function testOCRPipeline() {
  try {
    // Step 1: Check application exists and has documents
    console.log('📋 Step 1: Checking application and documents...');
    const appResponse = await fetch(`${BASE_URL}/api/applications/${APPLICATION_ID}`);
    const appData = await appResponse.json();
    
    if (!appData.success) {
      throw new Error('Application not found');
    }
    
    console.log(`✅ Application found: ${appData.application?.business_name || 'Unknown'}`);
    
    // Get documents
    const docsResponse = await fetch(`${BASE_URL}/api/applications/${APPLICATION_ID}/documents`);
    const docsData = await docsResponse.json();
    
    const documents = docsData.documents || [];
    console.log(`📄 Found ${documents.length} documents`);
    
    if (documents.length === 0) {
      throw new Error('No documents found for OCR testing');
    }
    
    // Step 2: Trigger OCR processing
    console.log('\n📖 Step 2: Triggering OCR processing...');
    const ocrResponse = await fetch(`${BASE_URL}/api/ocr/auto-trigger/${APPLICATION_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const ocrResult = await ocrResponse.json();
    console.log('OCR Trigger Result:', ocrResult);
    
    // Step 3: Wait and check banking analysis
    console.log('\n🏦 Step 3: Checking banking analysis results...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const bankingResponse = await fetch(`${BASE_URL}/api/applications/${APPLICATION_ID}/banking-analysis`);
    const bankingData = await bankingResponse.json();
    
    console.log('Banking Analysis Result:', bankingData);
    
    // Step 4: Summary
    console.log('\n📊 Pipeline Test Summary:');
    console.log(`- Application: ${APPLICATION_ID}`);
    console.log(`- Documents processed: ${documents.length}`);
    console.log(`- OCR trigger: ${ocrResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`- Banking analysis: ${bankingData.success ? '✅ Success' : '❌ Failed'}`);
    
    if (bankingData.success && bankingData.analysis) {
      console.log(`- Analysis data: ${Object.keys(bankingData.analysis).length} fields`);
    }
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
  }
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testOCRPipeline();