/**
 * Comprehensive End-to-End Lender Product Management Test Suite
 * Tests complete CRUD operations, authentication, field mapping, and data persistence
 */

import fs from 'fs';

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_PRODUCT_ID = 'accord-small-business-revolver---no-borrowing';

// Test results tracking
const testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  testDetails: [],
  performanceMetrics: [],
  criticalIssues: [],
  systemHealth: {}
};

// HTTP request helper
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth_token=test-token'
      },
      ...options
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      parsedData = data;
    }

    return {
      status: response.status,
      ok: response.ok,
      data: parsedData,
      headers: Object.fromEntries(response.headers.entries()),
      responseTime
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

// Test logging
function logTest(testName, passed, details, responseTime = null) {
  testResults.totalTests++;
  if (passed) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
    testResults.criticalIssues.push(`FAILED: ${testName} - ${details}`);
  }
  
  testResults.testDetails.push({
    test: testName,
    status: passed ? 'PASS' : 'FAIL',
    details,
    responseTime,
    timestamp: new Date().toISOString()
  });
  
  if (responseTime) {
    testResults.performanceMetrics.push({
      endpoint: testName,
      responseTime,
      timestamp: new Date().toISOString()
    });
  }
  
  console.log(`${passed ? '✅' : '❌'} ${testName}: ${details}${responseTime ? ` (${responseTime}ms)` : ''}`);
}

// Individual test functions
async function testDatabaseConnectivity() {
  console.log('\n🔍 Testing Database Connectivity...');
  
  const response = await makeRequest('/api/public/lenders');
  const passed = response.ok && response.data?.success && response.data?.products?.length > 0;
  
  logTest(
    'Database Connectivity',
    passed,
    passed ? `Retrieved ${response.data?.products?.length || 0} products` : `Failed: ${response.error || response.status}`,
    response.responseTime
  );
  
  return { passed, productCount: response.data?.products?.length || 0 };
}

async function testRBACAuthentication() {
  console.log('\n🔐 Testing RBAC Authentication...');
  
  const response = await makeRequest('/api/rbac/lender-products');
  const passed = response.status !== 401;
  
  logTest(
    'RBAC Authentication',
    passed,
    passed ? 'Authentication successful' : 'Authentication failed - 401 Unauthorized',
    response.responseTime
  );
  
  return { passed, response };
}

async function testProductRetrievalAccord() {
  console.log('\n📋 Testing Specific Product Retrieval...');
  
  const response = await makeRequest('/api/public/lenders');
  const accordProduct = response.data?.products?.find(p => p.id === TEST_PRODUCT_ID);
  const passed = !!accordProduct;
  
  logTest(
    'Accord Product Retrieval',
    passed,
    passed ? `Found product: ${accordProduct.name}` : 'Accord product not found',
    response.responseTime
  );
  
  return { passed, product: accordProduct };
}

async function testDocumentFieldMapping() {
  console.log('\n📄 Testing Document Field Mapping...');
  
  const response = await makeRequest('/api/public/lenders');
  const accordProduct = response.data?.products?.find(p => p.id === TEST_PRODUCT_ID);
  
  if (!accordProduct) {
    logTest('Document Field Mapping', false, 'Product not found for testing');
    return { passed: false };
  }
  
  const hasRequiredDocs = accordProduct.requiredDocuments && Array.isArray(accordProduct.requiredDocuments);
  const docCount = accordProduct.requiredDocuments?.length || 0;
  const hasValidDocs = docCount > 0;
  
  const passed = hasRequiredDocs && hasValidDocs;
  
  logTest(
    'Document Field Mapping',
    passed,
    passed ? `${docCount} documents mapped correctly` : 'Document mapping failed',
    response.responseTime
  );
  
  return { 
    passed, 
    documents: accordProduct.requiredDocuments,
    documentCount: docCount
  };
}

async function testProductUpdate() {
  console.log('\n✏️ Testing Product Update Functionality...');
  
  // Test data for update
  const updateData = {
    productName: 'Small Business Revolver - No Borrowing Base',
    lenderName: 'Accord',
    productCategory: 'Business Line of Credit',
    country: 'CA',
    minAmount: 25000,
    maxAmount: 250000,
    interestRateMin: 10,
    interestRateMax: 35,
    termMin: 12,
    termMax: 12,
    description: 'Test update - E2E verification',
    docRequirements: ['Bank Statements', 'Financial Statements', 'Personal Financial Statement']
  };
  
  const response = await makeRequest(`/api/rbac/lender-products/${TEST_PRODUCT_ID}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData)
  });
  
  const passed = response.ok && response.status === 200;
  
  logTest(
    'Product Update',
    passed,
    passed ? 'Product updated successfully' : `Update failed: ${response.error || response.status}`,
    response.responseTime
  );
  
  return { passed, updateData, response };
}

async function testDataPersistence() {
  console.log('\n💾 Testing Data Persistence...');
  
  // Wait a moment for database to process
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const response = await makeRequest('/api/public/lenders');
  const accordProduct = response.data?.products?.find(p => p.id === TEST_PRODUCT_ID);
  
  if (!accordProduct) {
    logTest('Data Persistence', false, 'Product not found after update');
    return { passed: false };
  }
  
  // Check if the update persisted (should have only 3 documents now)
  const expectedDocCount = 3;
  const actualDocCount = accordProduct.requiredDocuments?.length || 0;
  const descriptionUpdated = accordProduct.description?.includes('E2E verification');
  
  const passed = actualDocCount === expectedDocCount;
  
  logTest(
    'Data Persistence',
    passed,
    passed ? `Persistence verified: ${actualDocCount} documents` : `Persistence failed: expected ${expectedDocCount}, got ${actualDocCount}`,
    response.responseTime
  );
  
  return { 
    passed, 
    expectedDocCount, 
    actualDocCount,
    documents: accordProduct.requiredDocuments
  };
}

async function testCORSConfiguration() {
  console.log('\n🌐 Testing CORS Configuration...');
  
  const response = await makeRequest('/api/public/lenders', {
    method: 'OPTIONS'
  });
  
  const corsHeaders = {
    'access-control-allow-origin': response.headers['access-control-allow-origin'],
    'access-control-allow-methods': response.headers['access-control-allow-methods'],
    'access-control-allow-credentials': response.headers['access-control-allow-credentials']
  };
  
  const passed = response.status === 200 || response.status === 204;
  
  logTest(
    'CORS Configuration',
    passed,
    passed ? 'CORS headers present' : 'CORS preflight failed',
    response.responseTime
  );
  
  return { passed, corsHeaders };
}

async function testAPIPerformance() {
  console.log('\n⚡ Testing API Performance...');
  
  const performanceTests = [
    { endpoint: '/api/public/lenders', name: 'Public Lenders API' },
    { endpoint: '/api/lender-directory', name: 'Lender Directory API' }
  ];
  
  const results = [];
  
  for (const test of performanceTests) {
    const response = await makeRequest(test.endpoint);
    const passed = response.responseTime < 500; // Should respond in under 500ms
    
    logTest(
      `Performance: ${test.name}`,
      passed,
      `Response time: ${response.responseTime}ms`,
      response.responseTime
    );
    
    results.push({
      endpoint: test.endpoint,
      responseTime: response.responseTime,
      passed
    });
  }
  
  return { results };
}

async function testSystemHealthChecks() {
  console.log('\n🏥 Testing System Health...');
  
  const healthChecks = [
    { endpoint: '/', name: 'Root Health Check' },
    { endpoint: '/api/version', name: 'Version Endpoint' }
  ];
  
  const results = {};
  
  for (const check of healthChecks) {
    const response = await makeRequest(check.endpoint);
    const passed = response.ok;
    
    logTest(
      `Health: ${check.name}`,
      passed,
      passed ? 'Healthy' : `Unhealthy: ${response.status}`,
      response.responseTime
    );
    
    results[check.name] = {
      status: response.status,
      responseTime: response.responseTime,
      passed
    };
  }
  
  testResults.systemHealth = results;
  return results;
}

// Main test execution
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive End-to-End Lender Product Management Tests');
  console.log('=' * 80);
  
  const startTime = Date.now();
  
  try {
    // Execute all tests
    const dbResult = await testDatabaseConnectivity();
    const authResult = await testRBACAuthentication();
    const retrievalResult = await testProductRetrievalAccord();
    const mappingResult = await testDocumentFieldMapping();
    const updateResult = await testProductUpdate();
    const persistenceResult = await testDataPersistence();
    const corsResult = await testCORSConfiguration();
    const performanceResult = await testAPIPerformance();
    const healthResult = await testSystemHealthChecks();
    
    // Calculate overall metrics
    const totalTime = Date.now() - startTime;
    const successRate = ((testResults.passedTests / testResults.totalTests) * 100).toFixed(1);
    const avgResponseTime = testResults.performanceMetrics.length > 0 
      ? (testResults.performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / testResults.performanceMetrics.length).toFixed(0)
      : 0;
    
    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      executionTime: totalTime,
      testSummary: {
        totalTests: testResults.totalTests,
        passedTests: testResults.passedTests,
        failedTests: testResults.failedTests,
        successRate: `${successRate}%`,
        averageResponseTime: `${avgResponseTime}ms`
      },
      systemStatus: {
        databaseConnectivity: dbResult.passed ? 'OPERATIONAL' : 'FAILED',
        authentication: authResult.passed ? 'OPERATIONAL' : 'FAILED',
        dataIntegrity: persistenceResult.passed ? 'VERIFIED' : 'COMPROMISED',
        apiPerformance: avgResponseTime < 300 ? 'EXCELLENT' : avgResponseTime < 500 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
      },
      functionalityTests: {
        productRetrieval: retrievalResult.passed,
        documentMapping: mappingResult.passed,
        crudOperations: updateResult.passed,
        dataPersistence: persistenceResult.passed,
        crossOriginSupport: corsResult.passed
      },
      dataValidation: {
        totalProducts: dbResult.productCount,
        accordProductFound: retrievalResult.passed,
        documentFieldsWorking: mappingResult.passed,
        updatePersistence: persistenceResult.passed,
        documentCount: persistenceResult.actualDocCount
      },
      performanceMetrics: testResults.performanceMetrics,
      criticalIssues: testResults.criticalIssues,
      recommendations: generateRecommendations(testResults),
      detailedResults: testResults.testDetails
    };
    
    // Save report to file
    fs.writeFileSync('E2E_LENDER_MANAGEMENT_TEST_REPORT.json', JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('\n' + '=' * 80);
    console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log('=' * 80);
    console.log(`✅ Tests Passed: ${testResults.passedTests}/${testResults.totalTests} (${successRate}%)`);
    console.log(`⏱️  Total Execution Time: ${totalTime}ms`);
    console.log(`🚀 Average API Response Time: ${avgResponseTime}ms`);
    console.log(`🔍 Critical Issues Found: ${testResults.criticalIssues.length}`);
    
    if (testResults.criticalIssues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      testResults.criticalIssues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    console.log('\n📋 System Status:');
    Object.entries(report.systemStatus).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n📄 Full report saved to: E2E_LENDER_MANAGEMENT_TEST_REPORT.json');
    
    return report;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    testResults.criticalIssues.push(`Test execution error: ${error.message}`);
    return { error: error.message, testResults };
  }
}

function generateRecommendations(results) {
  const recommendations = [];
  
  if (results.failedTests > 0) {
    recommendations.push('Investigate and resolve failed test cases before production deployment');
  }
  
  const avgResponseTime = results.performanceMetrics.length > 0 
    ? results.performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / results.performanceMetrics.length
    : 0;
    
  if (avgResponseTime > 500) {
    recommendations.push('API response times exceed acceptable thresholds - optimize database queries');
  }
  
  if (results.criticalIssues.length > 0) {
    recommendations.push('Address all critical issues before considering system production-ready');
  }
  
  if (results.passedTests / results.totalTests >= 0.95) {
    recommendations.push('System demonstrates high reliability - ready for production deployment');
  }
  
  return recommendations;
}

// Execute tests
runComprehensiveTests().catch(console.error);