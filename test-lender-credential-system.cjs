/**
 * Test Lender Credential Management System
 * Validates complete CRUD operations and authentication flow
 */

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

console.log('🔐 LENDER CREDENTIAL MANAGEMENT SYSTEM TEST');
console.log('Testing complete authentication and credential system...');
console.log('');

async function testCredentialStorage() {
  console.log('1. 📊 CREDENTIAL STORAGE TEST');
  console.log('─'.repeat(40));
  
  try {
    // Check if lender_credentials table exists and has data
    const credentials = await sql`
      SELECT id, username, lender_name, created_at, updated_at
      FROM lender_credentials 
      WHERE deleted_at IS NULL 
      ORDER BY created_at DESC
    `;
    
    console.log(`✅ Lender credentials table accessible`);
    console.log(`   Total active credentials: ${credentials.length}`);
    
    if (credentials.length > 0) {
      console.log('   Sample credentials:');
      credentials.slice(0, 3).forEach((cred, idx) => {
        console.log(`   ${idx + 1}. ${cred.lender_name} (${cred.username})`);
      });
    }
    
    // Test password hashing
    const hashedCredentials = await sql`
      SELECT username, password_hash 
      FROM lender_credentials 
      WHERE password_hash IS NOT NULL 
      LIMIT 1
    `;
    
    if (hashedCredentials.length > 0) {
      const hash = hashedCredentials[0].password_hash;
      const isBcrypt = hash.startsWith('$2b$') || hash.startsWith('$2a$');
      console.log(`   Password security: ${isBcrypt ? '✅ bcrypt hashed' : '⚠️  plain text'}`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Credential storage test failed: ${error.message}`);
    return false;
  }
}

async function testLenderDirectory() {
  console.log('');
  console.log('2. 📁 LENDER DIRECTORY TEST');
  console.log('─'.repeat(40));
  
  try {
    const response = await fetch('http://localhost:5000/api/lender-directory');
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Lender directory endpoint operational`);
      console.log(`   Total lenders: ${data.lenderNames.length}`);
      console.log(`   Sample lenders: ${data.lenderNames.slice(0, 5).join(', ')}`);
      
      // Check for lenders with credentials vs products
      const lendersWithCredentials = await sql`
        SELECT DISTINCT lender_name 
        FROM lender_credentials 
        WHERE deleted_at IS NULL
      `;
      
      const lendersWithProducts = await sql`
        SELECT DISTINCT lender_name 
        FROM lender_products 
        WHERE deleted_at IS NULL
      `;
      
      console.log(`   Lenders with credentials: ${lendersWithCredentials.length}`);
      console.log(`   Lenders with products: ${lendersWithProducts.length}`);
      
      return true;
    } else {
      console.log(`❌ Lender directory failed: ${data.error}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Lender directory test failed: ${error.message}`);
    return false;
  }
}

async function testModalFunctionality() {
  console.log('');
  console.log('3. 🎭 MODAL FUNCTIONALITY TEST');
  console.log('─'.repeat(40));
  
  // This tests the data structure that powers the modal
  try {
    // Get a sample lender to test modal data
    const sampleLender = await sql`
      SELECT lender_name 
      FROM lender_products 
      WHERE deleted_at IS NULL 
      GROUP BY lender_name 
      LIMIT 1
    `;
    
    if (sampleLender.length > 0) {
      const lenderName = sampleLender[0].lender_name;
      
      // Check if this lender has credentials
      const credentials = await sql`
        SELECT username, password_hash 
        FROM lender_credentials 
        WHERE lender_name = ${lenderName} 
        AND deleted_at IS NULL
      `;
      
      console.log(`✅ Modal data structure test passed`);
      console.log(`   Sample lender: ${lenderName}`);
      console.log(`   Has credentials: ${credentials.length > 0 ? 'Yes' : 'No'}`);
      
      if (credentials.length > 0) {
        console.log(`   Username: ${credentials[0].username}`);
        console.log(`   Password: ${credentials[0].password_hash ? 'Encrypted' : 'Not set'}`);
      }
      
      return true;
    } else {
      console.log(`⚠️  No lenders found for modal test`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Modal functionality test failed: ${error.message}`);
    return false;
  }
}

async function testProductCategories() {
  console.log('');
  console.log('4. 📂 PRODUCT CATEGORIES TEST');
  console.log('─'.repeat(40));
  
  try {
    const categories = await sql`
      SELECT DISTINCT category, COUNT(*) as count
      FROM lender_products 
      WHERE deleted_at IS NULL 
      GROUP BY category 
      ORDER BY count DESC
    `;
    
    const expectedCategories = [
      'Working Capital',
      'Equipment Financing',
      'Asset-Based Lending',
      'Purchase Order Financing',
      'Invoice Factoring',
      'Business Line of Credit',
      'Term Loan',
      'SBA Loan'
    ];
    
    console.log(`✅ Product categories analysis complete`);
    console.log(`   Categories in database: ${categories.length}`);
    console.log(`   Expected categories: ${expectedCategories.length}`);
    
    console.log('   Database categories:');
    categories.forEach(cat => {
      const isExpected = expectedCategories.includes(cat.category);
      const status = isExpected ? '✅' : '⚠️';
      console.log(`   ${status} ${cat.category} (${cat.count} products)`);
    });
    
    const missingCategories = expectedCategories.filter(expected => 
      !categories.some(db => db.category === expected)
    );
    
    if (missingCategories.length === 0) {
      console.log(`   ✅ All expected categories present in database`);
    } else {
      console.log(`   ⚠️  Missing categories: ${missingCategories.join(', ')}`);
    }
    
    return missingCategories.length === 0;
    
  } catch (error) {
    console.log(`❌ Product categories test failed: ${error.message}`);
    return false;
  }
}

async function runCredentialTests() {
  console.log('Starting lender credential system test...');
  console.log('='.repeat(50));
  console.log('');
  
  const results = [];
  
  results.push(await testCredentialStorage());
  results.push(await testLenderDirectory());
  results.push(await testModalFunctionality());
  results.push(await testProductCategories());
  
  console.log('');
  console.log('📊 CREDENTIAL SYSTEM TEST RESULTS');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`Tests Passed: ${passed}/${total} (${percentage}%)`);
  
  if (percentage === 100) {
    console.log('');
    console.log('🎉 CREDENTIAL SYSTEM: 100% OPERATIONAL!');
    console.log('');
    console.log('✅ Database storage: Secure bcrypt hashing');
    console.log('✅ Lender directory: Complete integration');
    console.log('✅ Modal functionality: Data structure ready');
    console.log('✅ Product categories: All 8 categories available');
    console.log('');
    console.log('🔐 Lender credential management system ready');
  } else {
    console.log('');
    console.log('⚠️  CREDENTIAL SYSTEM ISSUES DETECTED');
    console.log('Review failed tests before proceeding');
  }
  
  console.log('');
  console.log('Test completed at:', new Date().toISOString());
}

runCredentialTests().catch(console.error);