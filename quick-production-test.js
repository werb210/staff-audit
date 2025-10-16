// Quick production test
async function testProduction() {
  const urls = [
    'https://staffportal.replit.app/api/public/lenders/health',
    'https://staffportal.replit.app/api/public/lenders'
  ];
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      const data = await response.text();
      console.log(`${url}: ${response.status} - ${data.substring(0, 100)}...`);
    } catch (error) {
      console.log(`${url}: ERROR - ${error.message}`);
    }
  }
}

testProduction().catch(console.error);