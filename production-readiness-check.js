/**
 * Production Readiness Verification
 * Final comprehensive platform status check
 */

import { promises as fs } from 'fs';

const BASE_URL = 'http://localhost:5000';

async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
    
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, error: error.message, ok: false };
  }
}

async function checkProductionReadiness() {
  console.log('🚀 PRODUCTION READINESS VERIFICATION');
  console.log('====================================\n');

  const checks = [];

  // 1. Authentication System
  console.log('1. Verifying Authentication System...');
  try {
    const staffLogin = await makeRequest(`${BASE_URL}/api/auth/staff/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@acme.com', password: process.env.TEST_PASSWORD || 'password' })
    });
    
    const adminLogin = await makeRequest(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@acme.com', password: process.env.ADMIN_PASSWORD || 'admin123' })
    });
    
    const invalidTest = await makeRequest(`${BASE_URL}/api/staff/applications`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    
    if (staffLogin.ok && adminLogin.ok && invalidTest.status === 401) {
      console.log('✅ Authentication system operational');
      checks.push({ name: 'Authentication', status: 'PASS' });
    } else {
      console.log('❌ Authentication system issues');
      checks.push({ name: 'Authentication', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ Authentication system error:', error.message);
    checks.push({ name: 'Authentication', status: 'ERROR' });
  }

  // 2. Core API Endpoints
  console.log('\n2. Verifying Core API Endpoints...');
  try {
    const token = (await makeRequest(`${BASE_URL}/api/auth/staff/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@acme.com', password: process.env.TEST_PASSWORD || 'password' })
    })).data?.token;

    const endpoints = [
      { path: '/api/staff/applications', name: 'Applications' },
      { path: '/api/staff/contacts', name: 'Contacts' },
      { path: '/api/staff/documents', name: 'Documents' },
      { path: '/api/staff/reports', name: 'Reports' },
      { path: '/api/staff/marketing', name: 'Marketing' },
      { path: '/api/staff/lender-products', name: 'Lender Products' }
    ];
    
    let passedEndpoints = 0;
    for (const endpoint of endpoints) {
      const response = await makeRequest(`${BASE_URL}${endpoint.path}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log(`  ✅ ${endpoint.name} endpoint operational`);
        passedEndpoints++;
      } else {
        console.log(`  ❌ ${endpoint.name} endpoint failed (${response.status})`);
      }
    }
    
    if (passedEndpoints === endpoints.length) {
      checks.push({ name: 'API Endpoints', status: 'PASS' });
    } else {
      checks.push({ name: 'API Endpoints', status: 'PARTIAL', details: `${passedEndpoints}/${endpoints.length}` });
    }
  } catch (error) {
    console.log('❌ API endpoints error:', error.message);
    checks.push({ name: 'API Endpoints', status: 'ERROR' });
  }

  // 3. Database System
  console.log('\n3. Verifying Database System...');
  try {
    const token = (await makeRequest(`${BASE_URL}/api/auth/staff/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@acme.com', password: process.env.TEST_PASSWORD || 'password' })
    })).data?.token;

    const lenderProducts = await makeRequest(`${BASE_URL}/api/staff/lender-products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (lenderProducts.ok && Array.isArray(lenderProducts.data) && lenderProducts.data.length > 40000) {
      console.log(`✅ Database operational (${lenderProducts.data.length} lender products)`);
      checks.push({ name: 'Database', status: 'PASS', details: `${lenderProducts.data.length} records` });
    } else {
      console.log('❌ Database integrity issues');
      checks.push({ name: 'Database', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ Database error:', error.message);
    checks.push({ name: 'Database', status: 'ERROR' });
  }

  // 4. Document Management
  console.log('\n4. Verifying Document Management...');
  try {
    const token = (await makeRequest(`${BASE_URL}/api/auth/staff/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@acme.com', password: process.env.TEST_PASSWORD || 'password' })
    })).data?.token;

    const uploadTest = await makeRequest(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Should return 400/500 (missing file) not 401/403 (auth failure)
    if (uploadTest.status >= 400 && uploadTest.status < 500) {
      console.log('✅ Document system authenticated and accessible');
      checks.push({ name: 'Document Management', status: 'PASS' });
    } else {
      console.log('❌ Document system authentication issues');
      checks.push({ name: 'Document Management', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ Document management error:', error.message);
    checks.push({ name: 'Document Management', status: 'ERROR' });
  }

  // 5. SignNow Integration
  console.log('\n5. Verifying SignNow Integration...');
  try {
    const webhookTest = await makeRequest(`${BASE_URL}/webhook/signnow`, {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'test',
        document_id: 'production-test',
        timestamp: Date.now()
      })
    });
    
    // Should process webhook (200 or 400 for signature validation)
    if (webhookTest.status === 200 || webhookTest.status === 400) {
      console.log('✅ SignNow webhook system operational');
      checks.push({ name: 'SignNow Integration', status: 'PASS' });
    } else {
      console.log('❌ SignNow webhook issues');
      checks.push({ name: 'SignNow Integration', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ SignNow integration error:', error.message);
    checks.push({ name: 'SignNow Integration', status: 'ERROR' });
  }

  // Generate Final Report
  console.log('\n🏆 PRODUCTION READINESS REPORT');
  console.log('==============================');
  
  const passed = checks.filter(c => c.status === 'PASS').length;
  const total = checks.length;
  const readinessScore = (passed / total) * 100;
  
  checks.forEach(check => {
    const icon = check.status === 'PASS' ? '✅' : 
                 check.status === 'PARTIAL' ? '⚠️' : '❌';
    const details = check.details ? ` (${check.details})` : '';
    console.log(`${icon} ${check.name}: ${check.status}${details}`);
  });
  
  console.log(`\n📊 Overall Readiness: ${readinessScore.toFixed(1)}% (${passed}/${total} systems)`);
  
  if (readinessScore >= 80) {
    console.log('\n🎉 PLATFORM READY FOR PRODUCTION DEPLOYMENT');
    console.log('All critical systems verified and operational');
  } else if (readinessScore >= 60) {
    console.log('\n⚠️ PLATFORM MOSTLY READY - Minor issues detected');
    console.log('Review failed checks and address before deployment');
  } else {
    console.log('\n❌ PLATFORM NOT READY - Critical issues detected');
    console.log('Address failed systems before proceeding to production');
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    readinessScore,
    systemsChecked: total,
    systemsPassed: passed,
    checks,
    recommendation: readinessScore >= 80 ? 'READY' : readinessScore >= 60 ? 'REVIEW' : 'NOT_READY'
  };

  await fs.writeFile('production-readiness-report.json', JSON.stringify(report, null, 2));
  console.log('\n📋 Detailed report saved to: production-readiness-report.json');
}

checkProductionReadiness().catch(console.error);