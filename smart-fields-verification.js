const puppeteer = require('puppeteer');
const axios = require('axios');

/**
 * Smart Fields Verification Script
 * This script creates a test application, gets the SignNow URL, and verifies smart fields
 */

async function verifySmartFieldsPopulation() {
  console.log('🔍 STARTING SMART FIELDS VERIFICATION...');
  
  try {
    // Step 1: Create test application
    const applicationResponse = await axios.post('http://localhost:5000/api/public/applications', {
      applicationId: 'smart-fields-verification',
      formData: {
        step1: {
          requestedAmount: 95000,
          use_of_funds: 'Working Capital',
          selectedCategory: 'Business Expansion',
          businessLocation: 'CA',
          averageMonthlyRevenue: 200000
        },
        step3: {
          businessName: 'Smart Fields Verification Corp',
          legalName: 'Smart Fields Verification Corporation',
          businessStructure: 'corporation',
          businessCity: 'Montreal',
          businessState: 'QC',
          businessPhone: '15145551234',
          businessStartDate: '2020-03-01'
        },
        step4: {
          applicantFirstName: 'Sarah',
          applicantLastName: 'Verification',
          applicantEmail: 'sarah.verification@smartfields.ca',
          applicantPhone: '+15145551234',
          applicantCity: 'Montreal',
          applicantState: 'QC',
          email: 'sarah.verification@smartfields.ca'
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://client.boreal.financial'
      }
    });

    const applicationId = applicationResponse.data.applicationId;
    console.log('✅ Application created:', applicationId);

    // Step 2: Get SignNow URL
    const signNowResponse = await axios.post(
      `http://localhost:5000/api/public/signnow/initiate/${applicationId}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://client.boreal.financial'
        }
      }
    );

    const signingUrl = signNowResponse.data.redirect_url;
    console.log('✅ SignNow URL obtained:', signingUrl);

    // Step 3: Open browser and verify smart fields
    const browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(signingUrl);
    
    console.log('🌐 Opened SignNow document, waiting for load...');
    await page.waitForTimeout(8000); // Wait for document to fully load
    
    // Take a screenshot
    await page.screenshot({ path: 'signnow-document-verification.png', fullPage: true });
    console.log('📸 Screenshot saved: signnow-document-verification.png');
    
    // Get page content to verify smart fields
    const content = await page.content();
    
    // Verify key smart fields are populated
    const fieldsToCheck = [
      'Smart Fields Verification Corporation',
      '$95,000',
      'sarah.verification@smartfields.ca',
      'Montreal',
      'Working Capital'
    ];
    
    console.log('🔍 Checking for smart field population...');
    const foundFields = [];
    const missingFields = [];
    
    for (const field of fieldsToCheck) {
      if (content.includes(field)) {
        foundFields.push(field);
        console.log(`✅ Found: ${field}`);
      } else {
        missingFields.push(field);
        console.log(`❌ Missing: ${field}`);
      }
    }
    
    console.log('\n📊 SMART FIELDS VERIFICATION RESULTS:');
    console.log(`✅ Found Fields: ${foundFields.length}/${fieldsToCheck.length}`);
    console.log(`❌ Missing Fields: ${missingFields.length}/${fieldsToCheck.length}`);
    
    if (foundFields.length === fieldsToCheck.length) {
      console.log('🎉 SUCCESS: All smart fields are populated correctly!');
    } else {
      console.log('⚠️  WARNING: Some smart fields may not be populated');
    }
    
    // Keep browser open for manual verification
    console.log('\n🔍 Browser will remain open for manual verification...');
    console.log('Press Ctrl+C to close when done verifying');
    
    // Wait for user to manually verify
    await new Promise(resolve => {
      process.on('SIGINT', () => {
        console.log('\n👋 Closing browser...');
        browser.close();
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the verification
verifySmartFieldsPopulation();