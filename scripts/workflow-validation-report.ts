import fs from "fs";

const STAFF = process.env.STAFF_API_BASE || "http://localhost:5000";

async function req<T=any>(m:"GET"|"POST", url:string, body?:any):Promise<{status:number, data:any, ok:boolean}>{
  try {
    const res = await fetch(url,{ method:m, headers:{"Content-Type":"application/json"}, body: body? JSON.stringify(body): undefined });
    const text = await res.text();
    let data:any; try{ data = text? JSON.parse(text):{} }catch{ data = { raw:text } }
    return {status: res.status, data, ok: res.ok};
  } catch (err) {
    return {status: 0, data: { error: err.message }, ok: false};
  }
}

(async()=>{
  console.log("== COMPREHENSIVE DOCUMENT WORKFLOW VALIDATION ==");
  console.log("Platform:", STAFF);
  console.log("Timestamp:", new Date().toISOString());
  console.log("");

  const results = {
    health: null as any,
    applications: {
      creation: null as any,
      retrieval: null as any, 
      listing: null as any
    },
    documents: {
      upload: null as any,
      listing: null as any,
      presign: null as any
    },
    s3: {
      connection: null as any,
      status: null as any
    },
    workflow: {
      ocr: null as any,
      banking: null as any
    },
    infrastructure: {
      uploadDir: null as any,
      routes: null as any
    }
  };

  // 1. Health Check
  console.log("🏥 HEALTH SYSTEM STATUS");
  results.health = await req("GET", `${STAFF}/api/health`);
  console.log(`   Health: ${results.health.ok ? '✅ OPERATIONAL' : '❌ FAILED'} (${results.health.status})`);
  
  // 2. Application Creation
  console.log("\n📝 APPLICATION SYSTEM STATUS");
  results.applications.creation = await req("POST", `${STAFF}/api/public/applications`, {
    businessLegalName:"Workflow Test Co", email:"test@workflow.com", source:"VALIDATION_TEST"
  });
  console.log(`   Creation: ${results.applications.creation.ok ? '✅ WORKING' : '❌ FAILED'} (${results.applications.creation.status})`);
  
  let testAppId = null;
  if (results.applications.creation.ok) {
    testAppId = results.applications.creation.data.applicationId || results.applications.creation.data.id;
    console.log(`   Test App ID: ${testAppId}`);
  }

  // 3. Application Retrieval (if app created)
  if (testAppId) {
    results.applications.retrieval = await req("GET", `${STAFF}/api/public/applications/${testAppId}`);
    console.log(`   Retrieval: ${results.applications.retrieval.ok ? '✅ WORKING' : '❌ FAILED'} (${results.applications.retrieval.status})`);
  }

  // 4. Document Upload Test
  console.log("\n📄 DOCUMENT SYSTEM STATUS");
  if (testAppId) {
    // Test with simple text content
    const formData = new FormData();
    formData.set("applicationId", testAppId);
    formData.set("category", "bank_statements");
    formData.set("document", new Blob(["Test document content"]), "test.txt");
    
    const uploadTests = [
      `${STAFF}/api/public/applications/${testAppId}/documents`,
      `${STAFF}/public/applications/${testAppId}/documents`,
      `${STAFF}/api/documents/upload`,
      `${STAFF}/api/upload/${testAppId}`
    ];
    
    for (const endpoint of uploadTests) {
      try {
        const res = await fetch(endpoint, { method: "POST", body: formData });
        console.log(`   Upload ${endpoint.split('/').slice(-2).join('/')}: ${res.ok ? '✅ WORKING' : '❌ FAILED'} (${res.status})`);
        if (res.ok) {
          results.documents.upload = { status: res.status, ok: true };
          break;
        }
      } catch (err) {
        console.log(`   Upload ${endpoint.split('/').slice(-2).join('/')}: ❌ ERROR`);
      }
    }
  }

  // 5. S3 System Status
  console.log("\n☁️  S3 INTEGRATION STATUS");
  const s3Tests = [
    `${STAFF}/api/s3/test-connection`,
    `${STAFF}/api/s3/status`,
    `${STAFF}/api/s3/health`
  ];
  
  for (const endpoint of s3Tests) {
    const result = await req("GET", endpoint);
    const name = endpoint.split('/').pop();
    console.log(`   ${name}: ${result.ok ? '✅ WORKING' : '❌ FAILED'} (${result.status})`);
    if (result.ok) {
      results.s3.status = result;
      break;
    }
  }

  // 6. Infrastructure Assessment
  console.log("\n🏗️  INFRASTRUCTURE STATUS");
  try {
    const uploadStats = fs.readdirSync('./uploads');
    const docStats = fs.readdirSync('./uploads/documents');
    console.log(`   Upload Directory: ✅ ACTIVE (${uploadStats.length} files)`);
    console.log(`   Document Storage: ✅ ACTIVE (${docStats.length} documents)`);
    results.infrastructure.uploadDir = { files: uploadStats.length, documents: docStats.length };
  } catch (err) {
    console.log(`   Upload Directory: ❌ MISSING`);
  }

  // 7. Advanced Workflow Tests
  console.log("\n🤖 ADVANCED WORKFLOW STATUS");
  const workflowTests = [
    { name: "OCR Processing", endpoint: `${STAFF}/api/ocr/status` },
    { name: "Banking Analysis", endpoint: `${STAFF}/api/banking/status` },
    { name: "Pipeline Management", endpoint: `${STAFF}/api/pipeline` },
    { name: "Lender Products", endpoint: `${STAFF}/api/lender-products` }
  ];
  
  for (const test of workflowTests) {
    const result = await req("GET", test.endpoint);
    console.log(`   ${test.name}: ${result.ok ? '✅ AVAILABLE' : '❌ UNAVAILABLE'} (${result.status})`);
  }

  // 8. Summary Assessment
  console.log("\n📊 WORKFLOW READINESS ASSESSMENT");
  const criticalSystems = [
    { name: "Health Check", status: results.health?.ok },
    { name: "Application Creation", status: results.applications.creation?.ok },
    { name: "Infrastructure", status: results.infrastructure.uploadDir?.files > 0 }
  ];
  
  const workingSystems = criticalSystems.filter(s => s.status).length;
  const totalSystems = criticalSystems.length;
  
  console.log(`   Core Systems: ${workingSystems}/${totalSystems} operational`);
  console.log(`   Document Upload: ${results.documents.upload?.ok ? 'READY' : 'NEEDS IMPLEMENTATION'}`);
  console.log(`   S3 Integration: ${results.s3.status?.ok ? 'READY' : 'NEEDS CONFIGURATION'}`);
  
  if (workingSystems === totalSystems) {
    console.log("\n🎉 PLATFORM STATUS: PRODUCTION-READY CORE");
    console.log("   ✅ Application intake operational");
    console.log("   ✅ Database connectivity confirmed");
    console.log("   ✅ Document infrastructure present");
  } else {
    console.log("\n⚠️  PLATFORM STATUS: NEEDS ATTENTION");
    console.log(`   ${totalSystems - workingSystems} critical systems require fixes`);
  }

  console.log(`\n📋 Test Application Created: ${testAppId || 'None'}`);
  console.log("📋 Validation Complete");
})();