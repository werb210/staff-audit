/**
 * Test Template Fields Direct API Access
 * Tests SignNow template field access directly
 */

async function testTemplateFieldsDirectly() {
  console.log('🔍 Testing SignNow Template Fields Direct Access');
  console.log('=================================================');
  
  const templateId = 'e7ba8b894c644999a7b38037ea66f4cc9cc524f5';
  
  // First, get OAuth token
  console.log('1. 🔐 Getting OAuth token...');
  
  const clientId = process.env.SIGNNOW_CLIENT_ID;
  const clientSecret = process.env.SIGNNOW_CLIENT_SECRET;
  const username = process.env.SIGNNOW_USERNAME;
  const password = process.env.SIGNNOW_PASSWORD;
  
  if (!clientId || !clientSecret || !username || !password) {
    console.log('❌ Missing SignNow credentials');
    return;
  }
  
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    // Get OAuth token
    const tokenResponse = await fetch('https://api.signnow.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        username: username,
        password: password,
        grant_type: 'password'
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.log('❌ OAuth failed:', tokenData);
      return;
    }
    
    console.log('✅ OAuth successful');
    const accessToken = tokenData.access_token;
    
    // Test different template access methods
    console.log('\n2. 📋 Testing template access methods...');
    
    // Method 1: Direct template access
    console.log('\n   Method 1: GET /template/{templateId}');
    const templateResponse1 = await fetch(`https://api.signnow.com/template/${templateId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${templateResponse1.status}`);
    if (templateResponse1.ok) {
      const templateData = await templateResponse1.json();
      console.log('   ✅ Template access successful');
      console.log(`   Template name: ${templateData.document_name || 'Unknown'}`);
      console.log(`   Fields count: ${templateData.fields?.length || 0}`);
      
      if (templateData.fields && templateData.fields.length > 0) {
        console.log('\n   📋 Available template fields:');
        templateData.fields.forEach((field, index) => {
          console.log(`   ${index + 1}. ${field.name || field.field_name || field.id} (${field.type})`);
        });
      }
    } else {
      const errorData = await templateResponse1.json();
      console.log('   ❌ Method 1 failed:', errorData);
    }
    
    // Method 2: Document copy approach
    console.log('\n   Method 2: POST /template/{templateId}/copy');
    const copyResponse = await fetch(`https://api.signnow.com/template/${templateId}/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_name: 'Test Template Copy'
      })
    });
    
    console.log(`   Status: ${copyResponse.status}`);
    if (copyResponse.ok) {
      const copyData = await copyResponse.json();
      console.log('   ✅ Template copy successful');
      console.log(`   New document ID: ${copyData.id}`);
      
      // Get the copied document details
      const docResponse = await fetch(`https://api.signnow.com/document/${copyData.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (docResponse.ok) {
        const docData = await docResponse.json();
        console.log(`   Document fields: ${docData.fields?.length || 0}`);
      }
    } else {
      const errorData = await copyResponse.json();
      console.log('   ❌ Method 2 failed:', errorData);
    }
    
    // Method 3: List user templates
    console.log('\n   Method 3: GET /user/templates');
    const templatesResponse = await fetch('https://api.signnow.com/user/templates', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${templatesResponse.status}`);
    if (templatesResponse.ok) {
      const templatesData = await templatesResponse.json();
      console.log('   ✅ Templates list successful');
      console.log(`   Total templates: ${templatesData.length || 0}`);
      
      // Find our template
      const ourTemplate = templatesData.find(t => t.id === templateId);
      if (ourTemplate) {
        console.log(`   ✅ Found our template: ${ourTemplate.document_name}`);
        console.log(`   Template ID matches: ${ourTemplate.id === templateId}`);
      } else {
        console.log(`   ❌ Template ${templateId} not found in user templates`);
        console.log('   Available templates:');
        templatesData.slice(0, 5).forEach(t => {
          console.log(`   - ${t.document_name} (${t.id})`);
        });
      }
    } else {
      const errorData = await templatesResponse.json();
      console.log('   ❌ Method 3 failed:', errorData);
    }
    
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log('Based on the results above:');
    console.log('1. If Method 1 worked: Template is accessible, check field names');
    console.log('2. If Method 2 worked: Use copy approach instead of direct access');
    console.log('3. If Method 3 worked but template not found: Check template ownership/sharing');
    console.log('4. If all failed: Check template ID or account permissions');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testTemplateFieldsDirectly().catch(console.error);