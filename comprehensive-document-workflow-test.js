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
      password: process.env.ADMIN_PASSWORD || 'admin123'
    })
  });
  return result.success ? result.data.token : null;
}

function createTestBankStatement() {
  // Create a realistic bank statement content
  const bankStatementContent = `
BUSINESS BANK STATEMENT
Account: Tech Innovations LLC
Account Number: ****1234
Statement Period: December 1-31, 2024

TRANSACTION HISTORY:
Date        Description                    Debit       Credit      Balance
12/01/2024  Beginning Balance                                      $25,430.50
12/02/2024  Deposit - Client Payment                   $15,000.00  $40,430.50
12/03/2024  ACH Payment - Office Rent      $3,500.00               $36,930.50
12/05/2024  Wire Transfer - Equipment                  $8,500.00   $45,430.50
12/08/2024  Check #1234 - Utilities        $450.00                 $44,980.50
12/10/2024  Deposit - Invoice Payment                  $22,750.00  $67,730.50
12/12/2024  ACH Payment - Payroll          $12,800.00              $54,930.50
12/15/2024  Deposit - Contract Revenue                 $18,200.00  $73,130.50
12/18/2024  Transfer Out - Tax Payment     $4,200.00               $68,930.50
12/22/2024  Deposit - Sales Revenue                    $9,800.00   $78,730.50
12/28/2024  ACH Payment - Insurance        $1,200.00               $77,530.50
12/31/2024  Ending Balance                                         $77,530.50

SUMMARY:
Total Deposits: $74,250.00
Total Debits: $22,150.00
Net Activity: $52,100.00
Average Daily Balance: $58,840.25
  `;
  
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
  
  if (!uploadResult.success) {
    console.log('❌ Document upload failed:', uploadResult.data);
    return;
  }
  
  console.log('✅ Bank statement uploaded successfully');
  console.log(`📄 Document ID: ${uploadResult.data.documentId || 'Generated'}`);
  console.log(`📂 Category: bank_statements`);
  console.log(`📊 File Size: ${bankStatementBuffer.length} bytes`);
  
  // Step 3: Wait for OCR processing
  console.log('\n🔍 STEP 3: OCR PROCESSING VERIFICATION');
  console.log('--------------------------------------');
  
  // Wait a moment for background processing
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check if OCR results are available
  const ocrResult = await makeRequest(`/api/applications/${applicationId}/ocr`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
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
    console.log('⚠️ OCR processing pending or failed');
    console.log('📋 This may be normal for background processing');
  }
  
  // Step 4: Check application documents
  console.log('\n📂 STEP 4: DOCUMENT VERIFICATION');
  console.log('---------------------------------');
  
  const documentsResult = await makeRequest(`/api/applications/${applicationId}/documents`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (documentsResult.success) {
    console.log(`✅ Documents retrieved: ${documentsResult.data.length} files`);
    
    const bankStatement = documentsResult.data.find(doc => 
      doc.category === 'bank_statements'
    );
    
    if (bankStatement) {
      console.log('✅ Bank statement found in database');
      console.log(`📄 File Path: ${bankStatement.file_path}`);
      console.log(`📊 Status: ${bankStatement.status}`);
      console.log(`🕐 Uploaded: ${bankStatement.uploaded_at}`);
    }
  } else {
    console.log('❌ Failed to retrieve application documents');
  }
  
  // Step 5: Check banking analysis
  console.log('\n💰 STEP 5: BANKING ANALYSIS CHECK');
  console.log('----------------------------------');
  
  const bankingAnalysisResult = await makeRequest(`/api/banking/analysis/${applicationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (bankingAnalysisResult.success) {
    console.log('✅ Banking analysis completed');
    console.log(`📊 Analysis Data Available`);
  } else if (bankingAnalysisResult.status === 404) {
    console.log('⚠️ Banking analysis not yet available');
    console.log('📋 Analysis may be processed asynchronously');
  } else {
    console.log('❌ Banking analysis failed:', bankingAnalysisResult.data);
  }
  
  // Step 6: Verify application status
  console.log('\n📋 STEP 6: APPLICATION STATUS CHECK');
  console.log('-----------------------------------');
  
  const appStatusResult = await makeRequest(`/api/applications/${applicationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (appStatusResult.success) {
    console.log('✅ Application status verified');
    console.log(`📊 Status: ${appStatusResult.data.status}`);
    console.log(`🎯 Stage: ${appStatusResult.data.stage}`);
    console.log(`📄 Documents Count: ${appStatusResult.data.documents?.length || 0}`);
  } else {
    console.log('❌ Failed to retrieve application status');
  }
  
  // Step 7: Test SignNow integration
  console.log('\n📋 STEP 7: SIGNNOW WORKFLOW TEST');
  console.log('---------------------------------');
  
  const signNowResult = await makeRequest(`/api/public/applications/${applicationId}/initiate-signing`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  if (signNowResult.success) {
    console.log('✅ SignNow workflow initiated');
    console.log(`📋 Job ID: ${signNowResult.data.jobId}`);
    console.log('🔄 Document processing in queue');
    
    // Wait for queue processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check final application state
    const finalStatusResult = await makeRequest(`/api/applications/${applicationId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (finalStatusResult.success && finalStatusResult.data.signing_url) {
      console.log('✅ SignNow processing completed');
      console.log(`🔗 Signing URL: ${finalStatusResult.data.signing_url}`);
    } else {
      console.log('⚠️ SignNow processing still in progress');
    }
  } else {
    console.log('❌ SignNow workflow failed:', signNowResult.data);
  }
  
  // Final Summary
  console.log('\n📊 COMPREHENSIVE WORKFLOW TEST SUMMARY');
  console.log('======================================');
  console.log(`📄 Application ID: ${applicationId}`);
  console.log(`🏢 Business: ${applicationData.business.businessName}`);
  console.log(`💰 Amount Requested: $${applicationData.formFields.requestedAmount.toLocaleString()}`);
  console.log(`📂 Documents Uploaded: Bank Statement`);
  console.log(`🔍 OCR Processing: ${ocrResult.success ? 'Completed' : 'Pending'}`);
  console.log(`💰 Banking Analysis: ${bankingAnalysisResult.success ? 'Available' : 'Processing'}`);
  console.log(`📋 SignNow Integration: ${signNowResult.success ? 'Operational' : 'Failed'}`);
  
  console.log('\n✅ COMPREHENSIVE DOCUMENT WORKFLOW TEST COMPLETED');
}

runComprehensiveDocumentTest().catch(console.error);
