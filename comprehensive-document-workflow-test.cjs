const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    const text = await response.text();
    try {
      return { status: response.status, data: JSON.parse(text), success: response.ok };
    } catch {
      return { status: response.status, data: text, success: response.ok };
    }
  } catch (error) {
    return { status: 0, data: error.message, success: false };
  }
}

async function getToken() {
  const result = await makeRequest('/api/rbac/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@boreal.com',
      password: 'admin123'
    })
  });
  return result.success ? result.data.token : null;
}

function createTestBankStatement() {
  const bankStatementContent = `BUSINESS BANK STATEMENT
Account: Tech Innovations LLC - Business Checking
Account Number: ****1234
Statement Period: December 1-31, 2024

BEGINNING BALANCE: $25,430.50

DEPOSITS AND CREDITS:
Date        Description                    Amount      Balance
12/02/2024  Client Payment - Project Alpha $15,000.00  $40,430.50
12/05/2024  Wire Transfer - Equipment Sale $8,500.00   $48,930.50
12/10/2024  Invoice Payment - ABC Corp     $22,750.00  $71,680.50
12/15/2024  Contract Revenue - Q4          $18,200.00  $89,880.50
12/22/2024  Sales Revenue - December       $9,800.00   $99,680.50

CHECKS AND DEBITS:
Date        Description                    Amount      Balance
12/03/2024  Rent Payment - Office Space    $3,500.00   $96,180.50
12/08/2024  Utilities - December           $450.00     $95,730.50
12/12/2024  Payroll - Bi-weekly           $12,800.00   $82,930.50
12/18/2024  Tax Payment - Quarterly        $4,200.00   $78,730.50
12/28/2024  Insurance Premium              $1,200.00   $77,530.50

ENDING BALANCE: $77,530.50

ACCOUNT SUMMARY:
Total Deposits: $74,250.00
Total Withdrawals: $22,150.00
Net Income: $52,100.00
Average Daily Balance: $58,840.25
Number of Transactions: 10
Service Charges: $0.00`;
  
  return Buffer.from(bankStatementContent);
}

async function uploadDocument(applicationId, filename, buffer, token) {
  const form = new FormData();
  form.append('files', buffer, {
    filename: filename,
    contentType: 'application/pdf'
  });
  form.append('category', 'bank_statements');
  
  try {
    const response = await fetch(`${BASE_URL}/api/upload/${applicationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });
    
    const text = await response.text();
    try {
      return { status: response.status, data: JSON.parse(text), success: response.ok };
    } catch {
      return { status: response.status, data: text, success: response.ok };
    }
  } catch (error) {
    return { status: 0, data: error.message, success: false };
  }
}

async function runComprehensiveDocumentTest() {
  console.log('🚀 COMPREHENSIVE DOCUMENT WORKFLOW TEST');
  console.log('=======================================\n');
  
  const token = await getToken();
  if (!token) {
    console.log('❌ Failed to get authentication token');
    return;
  }
  
  console.log('✅ Authentication successful\n');
  
  // Step 1: Create a new application
  console.log('📄 STEP 1: CREATE NEW APPLICATION');
  console.log('----------------------------------');
  
  const applicationData = {
    business: {
      businessName: "Tech Innovations LLC",
      industry: "technology",
      yearEstablished: 2020,
      employeeCount: 8,
      annualRevenue: 480000,
      monthlyRevenue: 40000,
      state: "CA",
      zipCode: "94105"
    },
    formFields: {
      requestedAmount: 75000,
      useOfFunds: "Working capital and equipment purchase",
      loanTerm: 18
    }
  };
  
  const createResult = await makeRequest('/api/public/applications', {
    method: 'POST',
    body: JSON.stringify(applicationData)
  });
  
  if (!createResult.success) {
    console.log('❌ Application creation failed:', createResult.data);
    return;
  }
  
  const applicationId = createResult.data.applicationId;
  console.log(`✅ Application created successfully`);
  console.log(`📋 Application ID: ${applicationId}`);
  console.log(`💰 Requested Amount: $${applicationData.formFields.requestedAmount.toLocaleString()}`);
  console.log(`🏢 Business: ${applicationData.business.businessName}`);
  
  // Step 2: Upload bank statement document
  console.log('\n📄 STEP 2: UPLOAD BANK STATEMENT');
  console.log('---------------------------------');
  
  const bankStatementBuffer = createTestBankStatement();
  const uploadResult = await uploadDocument(
    applicationId, 
    'tech_innovations_bank_statement_dec_2024.pdf',
    bankStatementBuffer,
    token
  );
  
  console.log(`📊 Upload Response Status: ${uploadResult.status}`);
  console.log(`📋 Upload Response:`, uploadResult.data);
  
  if (uploadResult.success) {
    console.log('✅ Bank statement uploaded successfully');
    if (uploadResult.data.documentId) {
      console.log(`📄 Document ID: ${uploadResult.data.documentId}`);
    }
    console.log(`📂 Category: bank_statements`);
    console.log(`📊 File Size: ${bankStatementBuffer.length} bytes`);
  } else {
    console.log('⚠️ Upload may have issues, checking details...');
  }
  
  // Step 3: Wait and check application documents
  console.log('\n📂 STEP 3: DOCUMENT VERIFICATION');
  console.log('---------------------------------');
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const documentsResult = await makeRequest(`/api/applications/${applicationId}/documents`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log(`📊 Documents API Status: ${documentsResult.status}`);
  console.log(`📋 Documents Response:`, documentsResult.data);
  
  if (documentsResult.success && documentsResult.data.length > 0) {
    console.log(`✅ Documents retrieved: ${documentsResult.data.length} files`);
    
    const bankStatement = documentsResult.data.find(doc => 
      doc.category === 'bank_statements' || doc.document_category === 'bank_statements'
    );
    
    if (bankStatement) {
      console.log('✅ Bank statement found in database');
      console.log(`📄 File Path: ${bankStatement.file_path || bankStatement.filePath}`);
      console.log(`📊 Status: ${bankStatement.status}`);
      console.log(`🕐 Uploaded: ${bankStatement.uploaded_at || bankStatement.createdAt}`);
    }
  } else {
    console.log('⚠️ No documents found or API unavailable');
  }
  
  // Step 4: Check OCR processing
  console.log('\n🔍 STEP 4: OCR PROCESSING CHECK');
  console.log('-------------------------------');
  
  const ocrResult = await makeRequest(`/api/applications/${applicationId}/ocr`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log(`📊 OCR API Status: ${ocrResult.status}`);
  
  if (ocrResult.success && ocrResult.data.length > 0) {
    console.log('✅ OCR processing completed');
    console.log(`📊 OCR Results Found: ${ocrResult.data.length} documents processed`);
    
    const bankStatementOCR = ocrResult.data.find(doc => 
      doc.document_category === 'bank_statements'
    );
    
    if (bankStatementOCR) {
      console.log('✅ Bank statement OCR data available');
      console.log(`📈 Confidence Score: ${bankStatementOCR.confidence_score || 'N/A'}`);
      if (bankStatementOCR.extracted_data?.summary) {
        console.log(`💰 Extracted Balance: ${bankStatementOCR.extracted_data.summary.ending_balance || 'N/A'}`);
        console.log(`📊 Total Deposits: ${bankStatementOCR.extracted_data.summary.total_deposits || 'N/A'}`);
      }
    }
  } else {
    console.log('⚠️ OCR processing not available or endpoint missing');
  }
  
  // Step 5: Check application status
  console.log('\n📋 STEP 5: APPLICATION STATUS CHECK');
  console.log('-----------------------------------');
  
  const appStatusResult = await makeRequest(`/api/applications/${applicationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (appStatusResult.success) {
    console.log('✅ Application status verified');
    console.log(`📊 Status: ${appStatusResult.data.status}`);
    console.log(`🎯 Stage: ${appStatusResult.data.stage}`);
    console.log(`📄 Business Name: ${appStatusResult.data.business_name}`);
    console.log(`💰 Requested Amount: $${appStatusResult.data.requested_amount?.toLocaleString()}`);
  } else {
    console.log('❌ Failed to retrieve application status');
  }
  
  // Step 6: Test SignNow integration
  console.log('\n📋 STEP 6: SIGNNOW WORKFLOW TEST');
  console.log('---------------------------------');
  
  const signNowResult = await makeRequest(`/api/public/applications/${applicationId}/initiate-signing`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  console.log(`📊 SignNow API Status: ${signNowResult.status}`);
  
  if (signNowResult.success) {
    console.log('✅ SignNow workflow initiated');
    console.log(`📋 Job ID: ${signNowResult.data.jobId}`);
    console.log('🔄 Document processing in queue');
    
    // Wait for queue processing
    console.log('⏳ Waiting for SignNow processing...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Check final application state
    const finalStatusResult = await makeRequest(`/api/applications/${applicationId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (finalStatusResult.success && finalStatusResult.data.signing_url) {
      console.log('✅ SignNow processing completed');
      console.log(`🔗 Signing URL: ${finalStatusResult.data.signing_url}`);
    } else {
      console.log('⚠️ SignNow processing still in progress or incomplete');
    }
  } else {
    console.log('❌ SignNow workflow failed:', signNowResult.data);
  }
  
  // Step 7: Final comprehensive check
  console.log('\n🔍 STEP 7: FINAL APPLICATION STATE');
  console.log('----------------------------------');
  
  const finalCheckResult = await makeRequest(`/api/applications/${applicationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (finalCheckResult.success) {
    const app = finalCheckResult.data;
    console.log('📋 FINAL APPLICATION STATE:');
    console.log(`   ID: ${app.id}`);
    console.log(`   Status: ${app.status}`);
    console.log(`   Stage: ${app.stage}`);
    console.log(`   Business: ${app.business_name}`);
    console.log(`   Amount: $${app.requested_amount?.toLocaleString()}`);
    console.log(`   Signing URL: ${app.signing_url ? 'Generated' : 'Not Available'}`);
    console.log(`   Created: ${app.created_at}`);
    console.log(`   Updated: ${app.updated_at}`);
  }
  
  // Final Summary
  console.log('\n📊 COMPREHENSIVE WORKFLOW TEST SUMMARY');
  console.log('======================================');
  console.log(`📄 Application Created: ${createResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`📂 Document Upload: ${uploadResult.success ? 'SUCCESS' : 'PARTIAL'}`);
  console.log(`🔍 OCR Processing: ${ocrResult.success ? 'AVAILABLE' : 'UNAVAILABLE'}`);
  console.log(`📋 SignNow Integration: ${signNowResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`📊 Final Status Check: ${finalCheckResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  console.log('\n✅ COMPREHENSIVE DOCUMENT WORKFLOW TEST COMPLETED');
  console.log(`🎯 Test Application ID: ${applicationId}`);
}

runComprehensiveDocumentTest().catch(console.error);
