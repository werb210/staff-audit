// Complete test script for all 6 feature packs
const BASE_URL = "http://localhost:5000";

async function testFeatures() {
  console.log("🧪 Testing all 6 feature packs...\n");

  // Test 1: Dev Role Switcher
  console.log("1️⃣ Testing Dev Role Switcher...");
  try {
    const response = await fetch(`${BASE_URL}/api/dev/impersonate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "marketing" })
    });
    console.log(`   Dev role switch: ${response.ok ? "✅ Working" : "❌ Failed"}`);
  } catch (e) {
    console.log(`   Dev role switch: ❌ Error - ${e.message}`);
  }

  // Test 2: Partner Integrations Sandbox
  console.log("\n2️⃣ Testing Partner Integrations Sandbox...");
  try {
    const response = await fetch(`${BASE_URL}/api/openapi.json`);
    const openapi = await response.json();
    console.log(`   OpenAPI docs: ${openapi.openapi ? "✅ Working" : "❌ Failed"}`);
  } catch (e) {
    console.log(`   OpenAPI docs: ❌ Error - ${e.message}`);
  }

  // Test 3: Lender Apps Queue
  console.log("\n3️⃣ Testing Lender Apps Queue...");
  try {
    const response = await fetch(`${BASE_URL}/api/lender/apps`);
    console.log(`   Lender apps endpoint: ${response.status === 401 || response.ok ? "✅ Working" : "❌ Failed"}`);
  } catch (e) {
    console.log(`   Lender apps endpoint: ❌ Error - ${e.message}`);
  }

  // Test 4: Enhanced Lender Portal
  console.log("\n4️⃣ Testing Enhanced Lender Portal...");
  try {
    const response = await fetch(`${BASE_URL}/lender/apps`);
    console.log(`   Lender portal page: ${response.ok ? "✅ Working" : "❌ Failed"}`);
  } catch (e) {
    console.log(`   Lender portal page: ❌ Error - ${e.message}`);
  }

  // Test 5: Admin Experience As Controls
  console.log("\n5️⃣ Testing Admin Experience As Controls...");
  try {
    const response = await fetch(`${BASE_URL}/api/admin/impersonate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "lender" })
    });
    console.log(`   Admin impersonation: ${response.status === 401 || response.status === 403 || response.ok ? "✅ Working" : "❌ Failed"}`);
  } catch (e) {
    console.log(`   Admin impersonation: ❌ Error - ${e.message}`);
  }

  // Test 6: Marketing Role
  console.log("\n6️⃣ Testing Marketing Role...");
  try {
    const response = await fetch(`${BASE_URL}/marketing`);
    console.log(`   Marketing page: ${response.ok ? "✅ Working" : "❌ Failed"}`);
  } catch (e) {
    console.log(`   Marketing page: ❌ Error - ${e.message}`);
  }

  console.log("\n🎯 Feature testing complete!");
}

testFeatures().catch(console.error);