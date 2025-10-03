/**
 * Comprehensive Staff Portal Content Verification
 * Simulates browser rendering to detect actual displayed content
 */

import http from 'http';
import { spawn } from 'child_process';

const STAFF_PORTAL_URL = 'http://localhost:5000/apps/staff-portal';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      }
    };

    const req = http.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function verifyStaffPortalContent() {
  console.log('🔍 Comprehensive Staff Portal Content Verification');
  console.log('===================================================');
  
  try {
    // Test the staff portal HTML
    const response = await makeRequest(STAFF_PORTAL_URL);
    console.log(`Status: ${response.status}`);
    
    if (response.status !== 200) {
      console.log('❌ Staff portal not accessible');
      return;
    }
    
    const html = response.data;
    
    // Analyze the HTML content in detail
    console.log('\n📄 HTML Content Analysis:');
    console.log('HTML Length:', html.length, 'characters');
    
    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'No title found';
    console.log('Page Title:', title);
    
    // Check for specific problematic client content
    const clientContent = [
      'Apply for Funding',
      'Business Application', 
      'Get Started',
      'Funding Application',
      'Ready to Get Started',
      'Choose your portal',
      'Financial Application Platform',
      'Streamlined funding solutions'
    ];
    
    console.log('\n⚠️ Checking for Client Application Content:');
    let foundClientContent = false;
    clientContent.forEach(content => {
      if (html.includes(content)) {
        console.log(`❌ FOUND CLIENT CONTENT: "${content}"`);
        foundClientContent = true;
      }
    });
    
    if (!foundClientContent) {
      console.log('✅ No client application content detected in HTML');
    }
    
    // Check for staff-specific content
    const staffContent = [
      'Staff Portal',
      'staff portal',
      'Staff Login',
      'staff login',
      'Staff Dashboard',
      'staff dashboard'
    ];
    
    console.log('\n✅ Checking for Staff Content:');
    let foundStaffContent = false;
    staffContent.forEach(content => {
      if (html.includes(content)) {
        console.log(`✅ Found staff content: "${content}"`);
        foundStaffContent = true;
      }
    });
    
    // Analyze React app structure
    console.log('\n🔧 React App Analysis:');
    if (html.includes('<div id="root">')) {
      console.log('✅ React root element found');
      
      // Check if root has any content already
      const rootMatch = html.match(/<div id="root">(.*?)<\/div>/s);
      if (rootMatch && rootMatch[1].trim()) {
        console.log('⚠️ Root element has pre-rendered content:', rootMatch[1].substring(0, 100) + '...');
      } else {
        console.log('✅ Root element is empty (client-side rendering)');
      }
    }
    
    // Check script tags
    const scriptMatches = html.match(/<script[^>]*src="([^"]*)"[^>]*>/g);
    if (scriptMatches) {
      console.log('📦 JavaScript files:');
      scriptMatches.forEach(script => {
        const srcMatch = script.match(/src="([^"]*)"/);
        if (srcMatch) {
          console.log('  -', srcMatch[1]);
        }
      });
    }
    
    // Test the main React application file
    console.log('\n🔍 Testing React Application Files:');
    try {
      const mainTsxResponse = await makeRequest(`http://localhost:5000/apps/staff-portal/src/main.tsx`);
      if (mainTsxResponse.status === 200) {
        console.log('✅ main.tsx accessible');
        
        // Check if it imports the correct App component
        if (mainTsxResponse.data.includes('import App from "./App"')) {
          console.log('✅ Imports correct App component');
        }
      }
    } catch (error) {
      console.log('ℹ️ main.tsx not directly accessible (bundled)');
    }
    
    // Raw HTML sample for manual inspection
    console.log('\n📋 HTML Sample (first 500 chars):');
    console.log(html.substring(0, 500));
    console.log('...');
    
    console.log('\n📋 HTML Sample (last 500 chars):');
    console.log('...');
    console.log(html.substring(html.length - 500));
    
  } catch (error) {
    console.log('❌ Error verifying content:', error.message);
  }
  
  // Test different approaches to the staff portal
  console.log('\n🔍 Testing Alternative Access Methods:');
  
  try {
    const rootResponse = await makeRequest('http://localhost:5000/apps/staff-portal/');
    console.log(`Root path with trailing slash: ${rootResponse.status}`);
  } catch (error) {
    console.log('Root path with trailing slash: Error');
  }
  
  try {
    const loginResponse = await makeRequest('http://localhost:5000/apps/staff-portal/login');
    console.log(`Direct login path: ${loginResponse.status}`);
  } catch (error) {
    console.log('Direct login path: Error');
  }
  
  console.log('\n📊 FINAL ASSESSMENT:');
  console.log('===================');
  console.log('If client content was found above, the deployment needs to be fixed.');
  console.log('If only staff content was found, the routing is working correctly.');
}

verifyStaffPortalContent().catch(console.error);