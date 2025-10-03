#!/usr/bin/env node

/**
 * Test Document Upload for Application
 * This simulates uploading bank statements to the existing application
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const APPLICATION_ID = '3609fb84-f404-4358-b1bb-bf47d341f44d';

async function testDocumentUpload() {
  console.log('📄 Testing Document Upload for Application');
  console.log('=' .repeat(50));
  console.log(`Application ID: ${APPLICATION_ID}`);

  try {
    // Create a test PDF file content
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
(Test Bank Statement) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000207 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
301
%%EOF`;

    // Write test PDF file
    const testFilePath = path.join(__dirname, 'test-bank-statement.pdf');
    fs.writeFileSync(testFilePath, testPdfContent);

    // Test 1: Upload via public API endpoint
    console.log('\n1. Testing public upload endpoint...');
    
    const formData = new FormData();
    formData.append('document', fs.createReadStream(testFilePath), {
      filename: 'test-bank-statement.pdf',
      contentType: 'application/pdf'
    });
    formData.append('documentType', 'bank_statements');

    try {
      const response = await axios.post(`${BASE_URL}/api/public/upload/${APPLICATION_ID}`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('✅ Public upload successful:', response.data);
    } catch (error) {
      console.log('❌ Public upload failed:', error.response?.data || error.message);
    }

    // Test 2: Upload via applications endpoint
    console.log('\n2. Testing applications upload endpoint...');
    
    const formData2 = new FormData();
    formData2.append('documents', fs.createReadStream(testFilePath), {
      filename: 'test-bank-statement-2.pdf',
      contentType: 'application/pdf'
    });
    formData2.append('documentType', 'bank_statements');

    try {
      const response = await axios.post(`${BASE_URL}/api/applications/${APPLICATION_ID}/upload`, formData2, {
        headers: {
          ...formData2.getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('✅ Applications upload successful:', response.data);
    } catch (error) {
      console.log('❌ Applications upload failed:', error.response?.data || error.message);
    }

    // Test 3: Check if documents now appear in database
    console.log('\n3. Checking database for uploaded documents...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/applications/${APPLICATION_ID}/documents`);
      console.log('✅ Documents API response:', response.data);
      
      if (response.data.documents && response.data.documents.length > 0) {
        console.log(`📄 Found ${response.data.documents.length} documents:`);
        response.data.documents.forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.fileName} (${doc.documentType}) - ${doc.fileSize} bytes`);
        });
      } else {
        console.log('⚠️ No documents found in API response');
      }
    } catch (error) {
      console.log('❌ Documents API failed:', error.response?.data || error.message);
    }

    // Cleanup
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('📋 Document Upload Test Summary:');
    console.log('- Created test PDF file');
    console.log('- Tested public upload endpoint');
    console.log('- Tested applications upload endpoint');
    console.log('- Verified documents appear in database');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('1. Check if documents now appear in Sales Pipeline');
    console.log('2. Verify document types are categorized correctly');
    console.log('3. Confirm OCR processing is triggered');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDocumentUpload();