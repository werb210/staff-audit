#!/usr/bin/env node

/**
 * 🧪 SIMPLIFIED UPLOAD SYSTEM TEST
 * Tests the simplified upload system without cloud backup complexity
 */

import { createReadStream, writeFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

// Create test PDF content
const testPdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Simplified Upload Test) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000190 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
284
%%EOF`;

async function testSimplifiedUpload() {
  console.log('🔧 Testing Simplified Upload System (Disk Only)');
  
  // Step 1: Check if system allows uploads
  console.log('\n1. Checking upload freeze status...');
  const freezeResponse = await fetch(`${API_BASE}/api/upload-freeze/freeze-status`);
  const freezeStatus = await freezeResponse.json();
  console.log('   Freeze Status:', freezeStatus.frozen ? 'FROZEN' : 'ENABLED');
  
  if (freezeStatus.frozen) {
    console.log('   Unfreezing uploads for test...');
    await fetch(`${API_BASE}/api/upload-freeze/unfreeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Testing simplified upload system' })
    });
  }
  
  // Step 2: Create test file
  console.log('\n2. Creating test PDF file...');
  const fileName = `simplified-upload-test-${Date.now()}.pdf`;
  writeFileSync(fileName, testPdfContent);
  console.log(`   Created: ${fileName} (${testPdfContent.length} bytes)`);
  
  // Step 3: Test simplified upload using existing endpoint
  console.log('\n3. Testing simplified upload to existing endpoint...');
  const formData = new FormData();
  formData.append('file', createReadStream(fileName));
  
  const uploadResponse = await fetch(`${API_BASE}/api/public/documents/b735f5c3-b446-47ec-916c-19be96faea3e`, {
    method: 'POST',
    body: formData
  });
  
  const uploadResult = await uploadResponse.json();
  console.log('   Upload Result Status:', uploadResponse.status);
  console.log('   Upload Result:', JSON.stringify(uploadResult, null, 2));
  
  if (uploadResult.success) {
    console.log('   ✅ Upload successful');
    console.log('   📋 Document ID:', uploadResult.documentId);
  } else {
    console.log('   ❌ Upload failed:', uploadResult.error);
  }
  
  // Step 4: Test document listing with direct SQL
  console.log('\n4. Testing document listing with database query...');
  try {
    const docResponse = await fetch(`${API_BASE}/api/applications/b735f5c3-b446-47ec-916c-19be96faea3e/documents`);
    const docResult = await docResponse.json();
    
    if (docResult.success) {
      console.log('   ✅ Document listing working');
      console.log('   📊 Total documents:', docResult.documents?.length || 0);
      console.log('   📄 Document types found:', 
        docResult.documents?.map(d => d.documentType || d.document_type) || []
      );
    } else {
      console.log('   ❌ Document listing failed:', docResult.error);
    }
  } catch (e) {
    console.log('   ❌ Document listing error:', e.message);
  }
  
  // Step 5: Check file system
  console.log('\n5. Checking file system for uploaded files...');
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('ls -la uploads/documents/ | tail -5');
    console.log('   Recent files in uploads/documents/:');
    console.log(stdout);
  } catch (e) {
    console.log('   Could not check file system:', e.message);
  }
  
  // Cleanup
  console.log('\n6. Cleanup...');
  try {
    const fs = await import('fs');
    fs.unlinkSync(fileName);
    console.log('   Test file cleaned up');
  } catch (e) {
    console.log('   Warning: Could not cleanup test file');
  }
  
  console.log('\n🎯 Simplified Upload Test Complete');
}

// Run the test
testSimplifiedUpload().catch(console.error);