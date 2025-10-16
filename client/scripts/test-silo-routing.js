// scripts/test-silo-routing.js
import fetch from "node-fetch";

const urls = [
  "/staff/slf/contacts",
  "/staff/slf/dashboard", 
  "/staff/slf/marketing",
  "/staff/slf/communication",
  "/staff/contacts",
  "/staff/dashboard",
  "/staff/marketing",
];

console.log('🧪 [SILO-ROUTING-TEST] Testing routing integrity...\n');

for (const url of urls) {
  try {
    const response = await fetch("http://localhost:5000" + url);
    const isSLF = url.includes('/slf/');
    const expectedSilo = isSLF ? 'SLF' : 'BF';
    
    console.log(`${url.padEnd(25)} → ${response.status} (${expectedSilo})`);
    
    if (response.status === 200) {
      const html = await response.text();
      const hasSLFMarker = html.includes('data-silo="slf"') || html.includes('SLF Portal');
      const hasBFMarker = html.includes('Boreal Financial') && !html.includes('Site Level');
      
      if (isSLF && !hasSLFMarker) {
        console.log(`  ⚠️  WARNING: SLF route may be serving BF content`);
      }
      if (!isSLF && hasSLFMarker) {
        console.log(`  ⚠️  WARNING: BF route may be serving SLF content`);
      }
    }
  } catch (err) {
    console.log(`${url.padEnd(25)} → ERROR: ${err.message}`);
  }
}

console.log('\n✅ [SILO-ROUTING-TEST] Test completed');