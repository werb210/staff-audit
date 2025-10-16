/**
 * Debug API Endpoints to understand current state
 */

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  
  return {
    status: response.status,
    data,
    headers: Object.fromEntries(response.headers.entries())
  };
}

async function debugEndpoints() {
  console.log('🔍 Debugging API endpoints...\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // Test basic health
  console.log('1. Testing health endpoint...');
  try {
    const health = await makeRequest(`${baseUrl}/health`);
    console.log(`   Status: ${health.status}, Response: ${JSON.stringify(health.data)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test OpenAPI
  console.log('\n2. Testing OpenAPI endpoint...');
  try {
    const openapi = await makeRequest(`${baseUrl}/openapi.json`);
    console.log(`   Status: ${openapi.status}, Title: ${openapi.data.info?.title}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test lender-products (working endpoint)
  console.log('\n3. Testing lender-products endpoint...');
  try {
    const lenderProducts = await makeRequest(`${baseUrl}/api/lender-products`);
    console.log(`   Status: ${lenderProducts.status}, Count: ${Array.isArray(lenderProducts.data) ? lenderProducts.data.length : 'Not array'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test public lenders (failing endpoint)
  console.log('\n4. Testing public/lenders endpoint...');
  try {
    const publicLenders = await makeRequest(`${baseUrl}/api/public/lenders`);
    console.log(`   Status: ${publicLenders.status}, Response: ${JSON.stringify(publicLenders.data)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test SignNow status with valid UUID
  console.log('\n5. Testing SignNow status with valid UUID...');
  try {
    const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const signNowStatus = await makeRequest(`${baseUrl}/api/signnow/status/${validUuid}`);
    console.log(`   Status: ${signNowStatus.status}, Response: ${JSON.stringify(signNowStatus.data)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test SignNow status with invalid UUID
  console.log('\n6. Testing SignNow status with invalid UUID...');
  try {
    const invalidUuid = 'test-app-id-123';
    const signNowStatus = await makeRequest(`${baseUrl}/api/signnow/status/${invalidUuid}`);
    console.log(`   Status: ${signNowStatus.status}, Response: ${JSON.stringify(signNowStatus.data)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
}

debugEndpoints().catch(console.error);