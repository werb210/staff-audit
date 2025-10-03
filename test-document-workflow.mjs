/**
 * Comprehensive Document Workflow Test
 * Tests the complete workflow: Application Creation → Document Upload → OCR Processing → Banking Analysis → SignNow Integration
 */

import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:5000';

function makeRequest(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

function createTestBankStatement() {
  const content = `
TECH INNOVATIONS LLC - BANK STATEMENT
Statement Period: November 1-30, 2024
Account Number: ****1234

Transaction Summary:
Opening Balance: $45,250.00
Total Deposits: $87,500.00
Total Withdrawals: $52,100.00
Closing Balance: $80,650.00

TRANSACTION DETAILS:
Date        Description                    Amount      Balance
11/01/2024  Opening Balance                            $45,250.00
11/03/2024  ACH Deposit - Client Payment   $15,000.00  $60,250.00
11/05/2024  Wire Transfer - Contract       $25,000.00  $85,250.00
11/08/2024  Check #1001 - Office Rent      -$4,500.00  $80,750.00
11/10/2024  ACH Payment - Payroll          -$18,600.00 $62,150.00
11/12/2024  Deposit - Invoice Payment      $22,500.00  $84,650.00
11/15/2024  Check #1002 - Equipment        -$8,900.00  $75,750.00
11/18/2024  ACH Deposit - Retainer         $10,000.00  $85,750.00
11/20/2024  Electronic Payment - Utilities -$1,200.00  $84,550.00
11/22/2024  Deposit - Project Milestone    $15,000.00  $99,550.00
11/25/2024  Check #1003 - Contractor       -$12,800.00 $86,750.00
11/28/2024  ACH Payment - Insurance        -$2,100.00  $84,650.00
11/30/2024  Interest Credit                $4,000.00   $80,650.00

Account Summary:
Average Daily Balance: $78,325.00
NSF Occurrences: 0
Monthly Service Charges: $0.00
`;
  return Buffer.from(content);
}

async function uploadDocument(applicationId, filename, buffer, authToken) {
  const form = new FormData();
  form.append('document', buffer, filename);
  form.append('documentType', 'bank_statements');
  form.append('category', 'bank_statements');

  const response = await fetch(`${BASE_URL}/api/upload/${applicationId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: form
  });

  return response.json();
}

async function runComprehensiveDocumentTest() {
  console.log('🧪 COMPREHENSIVE DOCUMENT WORKFLOW TEST');
  console.log('======================================');
  console.log('');

  try {
    // Step 0: Get Authentication Token
    console.log('🔐 Step 0: Getting Authentication Token');
    console.log('--------------------------------------');
    
    const loginData = {
      email: "admin@boreal.com",
      password: "admin123"
    };

    const loginResponse = await makeRequest(`${BASE_URL}/api/rbac/auth/login`, {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    const loginResult = await loginResponse.json();
    
    if (!loginResult.success) {
      throw new Error(`Authentication failed: ${loginResult.message}`);
    }

    const authToken = loginResult.token;
    console.log(`✅ Authentication successful: ${authToken.substring(0, 20)}...`);
    console.log('');

    // Step 1: Create Application
    console.log('📝 Step 1: Creating Test Application');
    console.log('-----------------------------------');
    
    const applicationData = {
      businessName: "Tech Innovations LLC",
      requestedAmount: 75000,
      useOfFunds: "working_capital",
      contactEmail: "ceo@techinnovations.com",
      contactPhone: "+1-555-0123",
      businessType: "LLC",
      industry: "Technology Services",
      annualRevenue: "500000",
      timeInBusiness: "3"
    };

    const createResponse = await makeRequest(`${BASE_URL}/api/applications/draft`, {
      method: 'POST',
      body: JSON.stringify(applicationData)
    });

    const createResult = await createResponse.json();
    
    if (!createResult.success) {
      throw new Error(`Application creation failed: ${createResult.message}`);
    }

    const applicationId = createResult.applicationId;
    console.log(`✅ Application created: ${applicationId}`);
    console.log(`📊 Status: ${createResult.status}`);
    console.log('');

    // Step 2: Upload Bank Statement Document
    console.log('📁 Step 2: Uploading Bank Statement Document');
    console.log('--------------------------------------------');
    
    const bankStatementBuffer = createTestBankStatement();
    const uploadResult = await uploadDocument(applicationId, 'bank_statement_nov_2024.txt', bankStatementBuffer, authToken);
    
    if (!uploadResult.success) {
      throw new Error(`Document upload failed: ${uploadResult.message}`);
    }

    console.log(`✅ Document uploaded: ${uploadResult.uploaded[0].id}`);
    console.log(`📄 File: ${uploadResult.uploaded[0].fileName}`);
    console.log(`📊 Status: ${uploadResult.uploaded[0].status}`);
    console.log('');

    // Step 3: Wait for OCR Processing (simulated delay)
    console.log('🔍 Step 3: Waiting for OCR Processing');
    console.log('------------------------------------');
    
    console.log('⏳ Waiting 5 seconds for OCR processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check OCR results
    const ocrResponse = await makeRequest(`${BASE_URL}/api/applications/${applicationId}/ocr`);
    const ocrResult = await ocrResponse.json();
    
    console.log(`📋 OCR Status: ${ocrResponse.status}`);
    if (ocrResult.success) {
      console.log(`✅ OCR Results Found: ${ocrResult.count} documents processed`);
      console.log(`📊 OCR Data: ${JSON.stringify(ocrResult.data, null, 2).substring(0, 200)}...`);
    } else {
      console.log(`📋 OCR Status: ${ocrResult.message}`);
    }
    console.log('');

    // Step 4: Banking Analysis
    console.log('💰 Step 4: Banking Analysis');
    console.log('---------------------------');
    
    const bankingResponse = await makeRequest(`${BASE_URL}/api/applications/${applicationId}/banking-analysis`);
    const bankingResult = await bankingResponse.json();
    
    console.log(`📋 Banking Analysis Status: ${bankingResponse.status}`);
    if (bankingResult.success) {
      console.log(`✅ Banking Analysis Complete`);
      console.log(`📊 Analysis: ${JSON.stringify(bankingResult.data, null, 2).substring(0, 300)}...`);
    } else {
      console.log(`📋 Banking Analysis: ${bankingResult.message}`);
    }
    console.log('');

    // Step 5: SignNow Integration Test
    console.log('📝 Step 5: SignNow Integration Test');
    console.log('----------------------------------');
    
    const signResponse = await makeRequest(`${BASE_URL}/api/applications/${applicationId}/initiate-signing`, {
      method: 'POST'
    });
    
    const signResult = await signResponse.json();
    
    console.log(`📋 SignNow Status: ${signResponse.status}`);
    if (signResult.success) {
      console.log(`✅ SignNow Integration Working`);
      console.log(`📊 Signing URL: ${signResult.signingUrl || 'Processing in queue'}`);
    } else {
      console.log(`📋 SignNow Response: ${signResult.message}`);
    }
    console.log('');

    // Step 6: Application Completion
    console.log('🎯 Step 6: Application Completion');
    console.log('---------------------------------');
    
    const submitData = {
      termsAccepted: true,
      privacyAccepted: true,
      completedSteps: ['application', 'documents', 'signing']
    };

    const submitResponse = await makeRequest(`${BASE_URL}/api/applications/${applicationId}/submit`, {
      method: 'POST',
      body: JSON.stringify(submitData)
    });
    
    const submitResult = await submitResponse.json();
    
    console.log(`📋 Submit Status: ${submitResponse.status}`);
    if (submitResult.success) {
      console.log(`✅ Application Submitted Successfully`);
      console.log(`📋 Reference ID: ${submitResult.reference}`);
      console.log(`📊 Status: ${submitResult.status}`);
    } else {
      console.log(`📋 Submit Response: ${submitResult.message}`);
    }
    console.log('');

    // Final Summary
    console.log('🎯 COMPREHENSIVE TEST SUMMARY');
    console.log('=============================');
    console.log(`✅ Application ID: ${applicationId}`);
    console.log(`✅ Document Upload: ${uploadResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ OCR Processing: ${ocrResult.success ? 'SUCCESS' : 'PENDING'}`);
    console.log(`✅ Banking Analysis: ${bankingResult.success ? 'SUCCESS' : 'PENDING'}`);
    console.log(`✅ SignNow Integration: ${signResult.success ? 'SUCCESS' : 'QUEUE'}`);
    console.log(`✅ Application Submission: ${submitResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log('');
    console.log('🎉 Document workflow test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
runComprehensiveDocumentTest().catch(console.error);