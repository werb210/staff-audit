/**
 * Test script to simulate document upload and verify automatic processing
 */

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testAutomaticProcessing() {
  try {
    console.log('🧪 Testing automatic document processing for new uploads...');
    
    // Create a test file
    const testContent = 'Test bank statement content for automatic processing';
    fs.writeFileSync('/tmp/test-bank-statement.txt', testContent);
    
    // Create form data for upload
    const form = new FormData();
    form.append('file', fs.createReadStream('/tmp/test-bank-statement.txt'));
    form.append('documentType', 'bank_statements');
    
    // Upload to an existing application
    const applicationId = 'a3e1b626-7588-4e3d-89ed-849e89eaca72';
    const uploadUrl = `http://localhost:5000/api/public/upload/${applicationId}`;
    
    console.log(`📤 Uploading test document to: ${uploadUrl}`);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'x-test-upload': 'true'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload successful:', JSON.stringify(result, null, 2));
      
      // Wait a moment for automatic processing
      setTimeout(async () => {
        // Check processing status
        const statusResponse = await fetch(`http://localhost:5000/api/auto-documents/status/${applicationId}`);
        const status = await statusResponse.json();
        console.log('📊 Processing status after upload:', JSON.stringify(status, null, 2));
      }, 2000);
      
    } else {
      console.error('❌ Upload failed:', response.status, await response.text());
    }
    
    // Cleanup
    fs.unlinkSync('/tmp/test-bank-statement.txt');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAutomaticProcessing();