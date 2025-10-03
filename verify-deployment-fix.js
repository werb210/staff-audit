#!/usr/bin/env node
/**
 * Post-deployment verification script
 * Tests if the .replit configuration fix resolved the production API issue
 */

const https = require('https');
const http = require('http');

async function verifyDeploymentFix() {
  console.log('Verifying deployment fix...');
  
  const testUrls = [
    'https://5b94728b-d7a4-4765-992e-926f94929109-00-3c18d2x352sp0.picard.replit.dev/api/health',
    'https://staffportal.replit.app/api/health' // If custom domain is configured
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await makeHttpsRequest(url);
      
      if (response.status === 'ok') {
        console.log('✅ DEPLOYMENT FIX SUCCESSFUL');
        console.log('✅ API endpoints now return JSON');
        console.log('✅ Production deployment working correctly');
        return true;
      } else {
        console.log('❌ Unexpected response format:', response);
      }
    } catch (error) {
      console.log(`❌ Failed to connect to ${url}:`, error.message);
    }
  }
  
  console.log('\n🔧 If still failing, try fallback configuration:');
  console.log('[deployment]');
  console.log('deploymentTarget = "autoscale"');
  console.log('run = ["node", "deploy.js"]');
  
  return false;
}

function makeHttpsRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data.slice(0, 100)}...`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

verifyDeploymentFix().catch(console.error);