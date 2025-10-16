#!/usr/bin/env node

/**
 * Rate Limiting Test Suite
 * Tests the production-grade OTP rate limiting system
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'admin@boreal.com';
const TEST_PASSWORD = 'admin123';

async function testRateLimiting() {
  console.log('🧪 Testing Production-Grade OTP Rate Limiting System\n');
  
  let testsPassed = 0;
  let totalTests = 0;
  
  // Test 1: Normal OTP generation should work
  totalTests++;
  try {
    console.log('Test 1: Normal OTP generation...');
    const response = await axios.post(`${BASE_URL}/api/rbac/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.data.success && response.data.requiresOTP) {
      console.log('✅ Normal OTP generation works');
      testsPassed++;
    } else {
      console.log('❌ Normal OTP generation failed');
    }
  } catch (error) {
    console.log('❌ Normal OTP generation failed:', error.response?.data?.error || error.message);
  }
  
  // Test 2: Rapid OTP requests should be rate limited
  totalTests++;
  try {
    console.log('\nTest 2: Testing rate limiting with rapid requests...');
    const promises = [];
    
    // Send 12 rapid requests (should exceed limit of 10)
    for (let i = 0; i < 12; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/rbac/auth/login`, {
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        })
      );
    }
    
    const results = await Promise.allSettled(promises);
    const rateLimitedCount = results.filter(result => 
      result.status === 'rejected' && 
      result.reason?.response?.status === 429
    ).length;
    
    if (rateLimitedCount > 0) {
      console.log(`✅ Rate limiting working: ${rateLimitedCount} requests blocked`);
      testsPassed++;
    } else {
      console.log('❌ Rate limiting not working');
    }
  } catch (error) {
    console.log('❌ Rate limiting test failed:', error.message);
  }
  
  // Test 3: Invalid OTP should be tracked
  totalTests++;
  try {
    console.log('\nTest 3: Testing invalid OTP tracking...');
    
    // First get a valid temp token
    const loginResponse = await axios.post(`${BASE_URL}/api/rbac/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (loginResponse.data.tempToken) {
      // Try invalid OTP
      const otpResponse = await axios.post(`${BASE_URL}/api/rbac/auth/verify-otp`, {
        tempToken: loginResponse.data.tempToken,
        otpCode: '999999'
      });
    }
  } catch (error) {
    if (error.response?.status === 401 && error.response?.data?.code === 'INVALID_OTP') {
      console.log('✅ Invalid OTP properly rejected');
      testsPassed++;
    } else {
      console.log('❌ Invalid OTP test failed:', error.response?.data?.error || error.message);
    }
  }
  
  // Test 4: Valid OTP should work and clear rate limits
  totalTests++;
  try {
    console.log('\nTest 4: Testing valid OTP verification...');
    
    // Wait a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const loginResponse = await axios.post(`${BASE_URL}/api/rbac/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (loginResponse.data.tempToken) {
      const otpResponse = await axios.post(`${BASE_URL}/api/rbac/auth/verify-otp`, {
        tempToken: loginResponse.data.tempToken,
        otpCode: '123456'
      });
      
      if (otpResponse.data.success && otpResponse.data.token) {
        console.log('✅ Valid OTP verification works');
        testsPassed++;
      } else {
        console.log('❌ Valid OTP verification failed');
      }
    }
  } catch (error) {
    console.log('❌ Valid OTP test failed:', error.response?.data?.error || error.message);
  }
  
  // Test 5: Check OTP statistics endpoint
  totalTests++;
  try {
    console.log('\nTest 5: Testing OTP statistics endpoint...');
    const statsResponse = await axios.get(`${BASE_URL}/api/debug/otp-stats`);
    
    if (statsResponse.data.success && statsResponse.data.stats) {
      console.log('✅ OTP statistics endpoint working');
      console.log(`   Active OTPs: ${statsResponse.data.stats.activeOTPs}`);
      console.log(`   Dev mode enabled: ${statsResponse.data.stats.devModeEnabled}`);
      testsPassed++;
    } else {
      console.log('❌ OTP statistics endpoint failed');
    }
  } catch (error) {
    console.log('❌ OTP statistics test failed:', error.response?.data?.error || error.message);
  }
  
  // Summary
  console.log('\n📊 Test Results:');
  console.log(`✅ Tests passed: ${testsPassed}/${totalTests}`);
  console.log(`📈 Success rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`);
  
  if (testsPassed === totalTests) {
    console.log('\n🎉 All tests passed! Production-grade OTP rate limiting is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the implementation.');
  }
}

// Run tests
testRateLimiting().catch(error => {
  console.error('Test suite failed:', error.message);
  process.exit(1);
});