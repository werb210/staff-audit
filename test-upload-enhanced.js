#!/usr/bin/env node

/**
 * 🧪 ENHANCED UPLOAD SYSTEM TEST
 * Tests the new data loss prevention system with real files
 */

import { createReadStream, writeFileSync, readFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

// Create test PDF content
const testPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF for Data Loss Prevention) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000190 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
284
%%EOF`;

async function testEnhancedUploadSystem() {
  console.log('🚀 Testing Enhanced Upload System with Data Loss Prevention');
  
  // Step 1: Check upload freeze status
  console.log('\n1. Checking upload freeze status...');
  const freezeResponse = await fetch(`${API_BASE}/api/upload-freeze/freeze-status`);
  const freezeStatus = await freezeResponse.json();
  console.log('   Freeze Status:', freezeStatus);
  
  // Step 2: Unfreeze if needed
  if (freezeStatus.frozen) {
    console.log('   Unfreezing uploads for test...');
    await fetch(`${API_BASE}/api/upload-freeze/unfreeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Testing enhanced upload system' })
    });
  }
  
  // Step 3: Create test file
  console.log('\n2. Creating test PDF file...');
  const fileName = `data-loss-prevention-test-${Date.now()}.pdf`;
  writeFileSync(fileName, testPdfContent);
  console.log(`   Created: ${fileName} (${testPdfContent.length} bytes)`);
  
  // Step 4: Test enhanced upload
  console.log('\n3. Testing enhanced upload with validation...');
  const formData = new FormData();
  formData.append('file', createReadStream(fileName));
  formData.append('applicationId', 'b735f5c3-b446-47ec-916c-19be96faea3e');
  formData.append('documentType', 'financial_statements');
  formData.append('uploadedBy', 'data-loss-prevention-test');
  
  const uploadResponse = await fetch(`${API_BASE}/api/persistence-validation/enhanced-upload`, {
    method: 'POST',
    body: formData
  });
  
  const uploadResult = await uploadResponse.json();
  console.log('   Upload Result:', JSON.stringify(uploadResult, null, 2));
  
  if (uploadResult.success) {
    console.log('   ✅ Upload successful with validation');
    console.log('   📋 Document ID:', uploadResult.documentId);
    console.log('   🔒 Checksum verified:', uploadResult.checksumVerified);
    console.log('   ☁️ Backup status:', uploadResult.backupStatus);
  } else {
    console.log('   ❌ Upload failed:', uploadResult.error);
  }
  
  // Step 5: Test document recovery API
  console.log('\n4. Testing document recovery API...');
  const recoveryResponse = await fetch(`${API_BASE}/api/document-recovery/application/b735f5c3-b446-47ec-916c-19be96faea3e/documents`);
  const recoveryResult = await recoveryResponse.json();
  
  if (recoveryResult.success) {
    console.log('   ✅ Document recovery API working');
    console.log('   📊 Business:', recoveryResult.businessName);
    console.log('   📄 Total documents:', recoveryResult.totalDocuments);
    console.log('   ❌ Missing files:', recoveryResult.missingFiles);
    console.log('   ✅ Healthy files:', recoveryResult.healthyFiles);
    
    // Show missing files details
    if (recoveryResult.missingFiles > 0) {
      console.log('\n   📋 Missing Files Details:');
      recoveryResult.documents
        .filter(doc => doc.needsRecovery)
        .forEach(doc => {
          console.log(`   ❌ ${doc.fileName} (${doc.id})`);
        });
    }
  } else {
    console.log('   ❌ Document recovery API failed:', recoveryResult.error);
  }
  
  // Step 6: Check alert system
  console.log('\n5. Checking alert system status...');
  const alertResponse = await fetch(`${API_BASE}/api/persistence-validation/alert-status`);
  const alertStatus = await alertResponse.json();
  console.log('   Alert Status:', alertStatus.status);
  console.log('   Recent alerts:', alertStatus.alertStats?.total || 0);
  
  // Cleanup
  console.log('\n6. Cleanup...');
  try {
    const fs = await import('fs');
    fs.unlinkSync(fileName);
    console.log('   Test file cleaned up');
  } catch (e) {
    console.log('   Warning: Could not cleanup test file');
  }
  
  console.log('\n🎯 Enhanced Upload System Test Complete');
}

// Run the test
testEnhancedUploadSystem().catch(console.error);