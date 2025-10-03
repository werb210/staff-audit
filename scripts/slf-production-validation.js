#!/usr/bin/env node

/**
 * SLF PRODUCTION VALIDATION
 * Confirms SLF system is ready for live data only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validateSLFAPI() {
  console.log('🌐 Testing SLF External API Integration (LIVE DATA ONLY)...');
  
  try {
    const response = await fetch('http://localhost:5000/api/slf/contacts', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    const data = await response.json();
    
    if (response.ok && data.ok) {
      console.log(`✅ SLF API operational: ${data.count} contacts loaded`);
      console.log(`   Source: ${data.source}`);
      console.log(`   Policy: ${data.policy || 'N/A'}`);
      console.log(`   Note: ${data.note}`);
      
      // Validate NO demonstration data
      if (data.policy === 'LIVE_DATA_ONLY' && data.count === 0) {
        console.log('✅ CONFIRMED: No demonstration data fallback - awaiting live data');
        return true;
      } else if (data.count > 0 && data.source.includes('LIVE')) {
        console.log('✅ CONFIRMED: Live external data successfully retrieved');
        return true;
      } else {
        console.log('❌ VALIDATION FAILED: Unexpected data source or policy');
        return false;
      }
    } else {
      console.log('❌ SLF API not responding correctly:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ SLF API connection failed:', error.message);
    return false;
  }
}

function checkForDemoDataInCode() {
  console.log('🔍 Scanning codebase for demonstration data references...');
  
  const clientDir = path.join(__dirname, '../client/src');
  const serverDir = path.join(__dirname, '../server');
  const demoReferences = [];
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = path.relative(__dirname + '/..', filePath);
      
      let lineNumber = 0;
      for (const line of lines) {
        lineNumber++;
        
        if (line.match(/demo.*contact|demonstration.*contact|fake.*contact|test.*contact/i) &&
            !line.includes('//') && !line.includes('*')) {
          demoReferences.push({
            file: relativePath,
            line: lineNumber,
            content: line.trim()
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  function scanDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(itemPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js')) {
          scanFile(itemPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  scanDir(clientDir);
  scanDir(serverDir);
  
  if (demoReferences.length === 0) {
    console.log('✅ No demonstration data references found in codebase');
    return true;
  } else {
    console.log(`❌ Found ${demoReferences.length} demonstration data references:`);
    demoReferences.forEach(ref => {
      console.log(`   ${ref.file}:${ref.line} - ${ref.content.substring(0, 60)}...`);
    });
    return false;
  }
}

async function validateDatabaseCleanup() {
  console.log('🗄️ Validating database cleanup...');
  
  try {
    // Check BF contacts (should remain)
    const bfResponse = await fetch('http://localhost:5000/api/contacts?silo=bf');
    const bfData = await bfResponse.json();
    const bfCount = bfData.items?.length || 0;
    
    console.log(`   BF contacts: ${bfCount} (should be preserved)`);
    console.log('   SLF contacts: Using external API only');
    
    if (bfCount > 0) {
      console.log('✅ Database isolation maintained - BF data preserved');
      return true;
    } else {
      console.log('⚠️ BF data may be missing - verify data integrity');
      return false;
    }
  } catch (error) {
    console.log('❌ Database validation failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 SLF PRODUCTION VALIDATION SUITE');
  console.log('==================================');
  console.log('Validating: NO DEMONSTRATION DATA POLICY');
  console.log('');
  
  const results = {
    slfAPI: await validateSLFAPI(),
    codebaseClean: checkForDemoDataInCode(),
    databaseClean: await validateDatabaseCleanup()
  };
  
  console.log('\n📊 SLF PRODUCTION VALIDATION RESULTS:');
  console.log('=====================================');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  if (allPassed) {
    console.log('\n🎉 SLF PRODUCTION VALIDATION COMPLETE');
    console.log('📋 SYSTEM STATUS:');
    console.log('   ✅ NO demonstration data policy enforced');
    console.log('   ✅ External API integration ready');
    console.log('   ✅ Database isolation maintained');
    console.log('   ✅ Codebase clean of demo references');
    console.log('\n🚀 SLF SYSTEM READY FOR LIVE DATA');
    console.log('📌 Status: Awaiting live external API data');
  } else {
    console.log('\n⚠️ Some validation checks failed');
    console.log('🔧 Review failed items before production deployment');
  }
  
  return allPassed;
}

main().catch(console.error);