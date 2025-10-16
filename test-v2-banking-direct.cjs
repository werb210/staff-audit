const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Mock bank statement text for testing
const mockBankStatementText = `
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
`;

async function testV2BankingModuleDirect() {
  console.log('🏦 V2 Banking Analysis Module - Direct API Test\n');

  try {
    // Test with existing application ID from the database
    const testApplicationId = '9d62bd92-dcb5-480f-92b5-f2dd361e5394'; // Sample ID from logs

    console.log('Step 1: Testing banking analysis API directly...');
    console.log('Using Application ID:', testApplicationId);

    // Test banking analysis endpoint directly
    const startTime = Date.now();
    
    const analysisResponse = await axios.post(
      `${BASE_URL}/api/banking-analysis/${testApplicationId}`,
      {},
      { 
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Banking analysis completed in ${processingTime}ms`);
    
    if (analysisResponse.data) {
      console.log('\n📊 Analysis Results:');
      console.log('   - Financial Health Score:', analysisResponse.data.financialHealthScore);
      console.log('   - Bank Name:', analysisResponse.data.bankName);
      console.log('   - Analysis Period:', analysisResponse.data.statementPeriod);
      
      if (analysisResponse.data.balances) {
        console.log('\n💰 Balance Information:');
        console.log('   - Opening Balance:', analysisResponse.data.balances.openingBalance);
        console.log('   - Closing Balance:', analysisResponse.data.balances.closingBalance);
        console.log('   - Average Daily Balance:', analysisResponse.data.balances.averageDailyBalance);
      }
      
      if (analysisResponse.data.riskFactors) {
        console.log('\n⚠️  Risk Factors:', analysisResponse.data.riskFactors.length);
        analysisResponse.data.riskFactors.forEach((risk, index) => {
          console.log(`   ${index + 1}. ${risk.factor} (${risk.severity})`);
        });
      }
      
      if (analysisResponse.data.recommendations) {
        console.log('\n💡 Recommendations:', analysisResponse.data.recommendations.length);
        analysisResponse.data.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
    }

    // Test retrieval endpoint
    console.log('\n\nStep 2: Testing analysis retrieval...');
    const retrievalResponse = await axios.get(`${BASE_URL}/api/banking-analysis/${testApplicationId}`);
    console.log('✅ Analysis retrieval successful');
    console.log('   - Retrieved Analysis ID:', retrievalResponse.data?.id);

    // Test statistics endpoint
    console.log('\nStep 3: Testing statistics endpoint...');
    const statsResponse = await axios.get(`${BASE_URL}/api/banking-analysis/stats`);
    console.log('✅ Statistics endpoint working');
    console.log('📊 Global Statistics:');
    console.log('   - Total Analyses:', statsResponse.data.totalAnalyses);
    console.log('   - Average Health Score:', statsResponse.data.averageHealthScore);
    console.log('   - Average Processing Time:', statsResponse.data.averageProcessingTime, 'ms');

    // Performance assessment
    console.log('\n🎯 Performance Assessment:');
    if (processingTime < 1000) {
      console.log(`✅ Excellent performance: ${processingTime}ms (under 1 second)`);
    } else if (processingTime < 2000) {
      console.log(`✅ Good performance: ${processingTime}ms (under 2 seconds)`);
    } else {
      console.log(`⚠️  Performance note: ${processingTime}ms (over 2 seconds)`);
    }

    console.log('\n🎉 V2 Banking Analysis Module Status:');
    console.log('✅ API endpoints operational');
    console.log('✅ AI analysis engine working');
    console.log('✅ Database integration complete');
    console.log('✅ Performance metrics tracking');

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Trying with a different approach...');
      
      // Try creating a simple test case
      try {
        const testDoc = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Sample document ID
        console.log('Testing document processing endpoint...');
        
        const docResponse = await axios.post(
          `${BASE_URL}/api/banking-analysis/process-document/${testDoc}`,
          {},
          { timeout: 15000 }
        );
        
        console.log('✅ Document processing endpoint working');
        console.log('   - Processing result:', docResponse.data);
        
      } catch (docError) {
        console.error('❌ Document processing test failed:', docError.response?.data || docError.message);
      }
    }
    
    if (error.response?.status) {
      console.error('   - HTTP Status:', error.response.status);
      console.error('   - Response:', error.response.data);
    }
  }
}

testV2BankingModuleDirect();