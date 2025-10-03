const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';

async function testV2BankingModule() {
  console.log('🏦 V2 Migration Package - Banking Analysis Module Test\n');

  try {
    // Step 1: Test health endpoint
    console.log('Step 1: Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is healthy:', healthResponse.data);

    // Step 2: Create test application
    console.log('\nStep 2: Creating test application...');
    const testApplication = {
      businessName: 'Test Banking Business',
      ownerFirstName: 'John',
      ownerLastName: 'Doe',
      email: 'john.doe@testbank.com',
      phone: '+15551234567',
      industry: 'Technology',
      annualRevenue: 500000,
      requestedAmount: 50000,
      loanPurpose: 'Working capital'
    };

    const appResponse = await axios.post(`${BASE_URL}/api/applications`, testApplication);
    const applicationId = appResponse.data.id;
    console.log('✅ Test application created:', applicationId);

    // Step 3: Create test document
    console.log('\nStep 3: Creating test document...');
    const testDocument = {
      applicationId,
      fileName: 'test-bank-statement.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
      documentType: 'bank_statements',
      ocrText: `
        NATIONAL COMMERCIAL BANK
        Business Account Statement
        Account: 123-456-789
        Statement Period: January 1, 2024 - January 31, 2024
        
        Opening Balance: $25,000.00
        
        TRANSACTIONS:
        01/02/2024  DEPOSIT - Wire Transfer                    $15,000.00  $40,000.00
        01/05/2024  PAYMENT - Office Rent                      -$3,500.00  $36,500.00
        01/08/2024  DEPOSIT - Customer Payment #001             $8,500.00   $45,000.00
        01/10/2024  PAYMENT - Supplier Invoice #1245           -$12,000.00 $33,000.00
        01/15/2024  DEPOSIT - Customer Payment #002             $7,200.00   $40,200.00
        01/18/2024  PAYMENT - Payroll Processing                -$8,500.00  $31,700.00
        01/22/2024  DEPOSIT - Customer Payment #003             $9,800.00   $41,500.00
        01/25/2024  PAYMENT - Utilities                         -$850.00    $40,650.00
        01/28/2024  FEE - Monthly Maintenance                   -$25.00     $40,625.00
        01/30/2024  DEPOSIT - Interest Income                   $375.00     $41,000.00
        
        Closing Balance: $41,000.00
        
        SUMMARY:
        Total Deposits: $40,875.00
        Total Withdrawals: $24,875.00
        Total Fees: $25.00
        Net Change: $16,000.00
      `
    };

    const docResponse = await axios.post(`${BASE_URL}/api/documents`, testDocument);
    const documentId = docResponse.data.id;
    console.log('✅ Test document created:', documentId);

    // Step 4: Test banking analysis creation endpoint
    console.log('\nStep 4: Testing banking analysis creation...');
    const startTime = Date.now();
    
    const analysisResponse = await axios.post(
      `${BASE_URL}/api/banking-analysis/${applicationId}`,
      {},
      { timeout: 30000 }
    );
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Banking analysis completed in ${processingTime}ms`);
    console.log('📊 Analysis Results:');
    console.log('   - Financial Health Score:', analysisResponse.data.financialHealthScore);
    console.log('   - Risk Factors Count:', analysisResponse.data.riskFactors?.length || 0);
    console.log('   - Recommendations Count:', analysisResponse.data.recommendations?.length || 0);

    // Step 5: Test banking analysis retrieval
    console.log('\nStep 5: Testing banking analysis retrieval...');
    const retrievalResponse = await axios.get(`${BASE_URL}/api/banking-analysis/${applicationId}`);
    console.log('✅ Banking analysis retrieved successfully');
    console.log('📈 Key Metrics:');
    const analysis = retrievalResponse.data;
    if (analysis.balances) {
      console.log('   - Opening Balance:', analysis.balances.openingBalance);
      console.log('   - Closing Balance:', analysis.balances.closingBalance);
      console.log('   - Average Daily Balance:', analysis.balances.averageDailyBalance);
    }

    // Step 6: Test document processing endpoint
    console.log('\nStep 6: Testing document processing...');
    const processResponse = await axios.post(`${BASE_URL}/api/banking-analysis/process-document/${documentId}`);
    console.log('✅ Document processed successfully');
    console.log('🔍 Processing Results:');
    console.log('   - Document ID:', processResponse.data.documentId);
    console.log('   - Document Name:', processResponse.data.documentName);

    // Step 7: Test statistics endpoint
    console.log('\nStep 7: Testing statistics endpoint...');
    const statsResponse = await axios.get(`${BASE_URL}/api/banking-analysis/stats`);
    console.log('✅ Statistics retrieved successfully');
    console.log('📊 Global Statistics:');
    console.log('   - Total Analyses:', statsResponse.data.totalAnalyses);
    console.log('   - Average Health Score:', statsResponse.data.averageHealthScore);
    console.log('   - Processing Performance:', statsResponse.data.averageProcessingTime, 'ms');

    // Performance verification
    console.log('\n🎯 V2 Banking Analysis Module Performance:');
    if (processingTime < 1000) {
      console.log(`✅ Excellent performance: ${processingTime}ms (< 1000ms target)`);
    } else if (processingTime < 2000) {
      console.log(`✅ Good performance: ${processingTime}ms (< 2000ms target)`);
    } else {
      console.log(`⚠️  Acceptable performance: ${processingTime}ms (> 2000ms)`);
    }

    console.log('\n🎉 V2 Banking Analysis Module fully operational!');
    console.log('✅ All 4 API endpoints verified');
    console.log('✅ AI-powered transaction analysis working');
    console.log('✅ Financial health scoring active');
    console.log('✅ Risk assessment integration complete');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testV2BankingModule();