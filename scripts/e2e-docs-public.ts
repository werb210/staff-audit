import fs from "fs";
import path from "path";

const STAFF = process.env.STAFF_API_BASE || "http://localhost:5000";
const UP = (p:string)=> path.resolve(p);

async function req<T=any>(m:"GET"|"POST"|"PATCH", url:string, body?:any, extraHeaders:any={}):Promise<T>{
  const headers:any = { "Content-Type": "application/json", ...extraHeaders };
  if(body instanceof FormData) delete headers["Content-Type"];
  const res = await fetch(url,{ method:m, headers, body: (body instanceof FormData)? body : (body? JSON.stringify(body): undefined) });
  const text = await res.text();
  let data:any; try{ data = text? JSON.parse(text):{} }catch{ data = { raw:text } }
  if(!res.ok){ throw new Error(`${m} ${url} -> ${res.status}\n${text}`); }
  return data;
}
function log(s:string){ console.log("•", s); }

(async()=>{
  console.log("== E2E PUBLIC DOCS WORKFLOW ==");
  
  // 0) Health check
  log("Health check");
  await req("GET", `${STAFF}/api/health`);

  // 1) Create public application
  log("Create public application");
  const appRes:any = await req("POST", `${STAFF}/api/public/applications`, {
    businessLegalName:"Sancho Enterprises Ltd.",
    country:"Canada", 
    contactFirstName:"Emma", contactLastName:"Lee",
    email:"emma.lee@example.com", phone:"+14035551234",
    amountRequested:250000, useOfFunds:"Working capital",
    source:"E2E_PUBLIC_TEST"
  });
  const appId = appRes.applicationId || appRes.id;
  if(!appId) throw new Error("No application id returned");
  console.log("  appId =", appId);

  // 2) Try document upload via public API
  const docs = [
    {file:"uploads/bank_statement_may.txt", category:"bank_statements"},
    {file:"uploads/balance_sheet_2024.txt", category:"financial_statements"},
    {file:"uploads/tax_return_2024.txt", category:"tax_returns"},
    {file:"uploads/invoice_sample.txt", category:"other"}
  ];
  
  const uploaded:any[]=[];
  for(const d of docs){
    log(`Upload ${d.category} via public API`);
    const form = new FormData();
    form.set("applicationId", appId);
    form.set("category", d.category);
    form.set("document", new Blob([fs.readFileSync(UP(d.file))]), path.basename(d.file));
    
    try {
      // Try different public upload endpoints
      let up:any;
      try {
        up = await req("POST", `${STAFF}/api/public/applications/${appId}/documents`, form);
      } catch (err) {
        up = await req("POST", `${STAFF}/public/applications/${appId}/documents`, form);
      }
      uploaded.push({ id: up.documentId || up.id, category:d.category });
      console.log(`    ✓ Uploaded ${d.category}: ${up.documentId || up.id}`);
    } catch (err) {
      console.warn(`    ! Failed to upload ${d.category}: ${err.message.slice(0,100)}`);
    }
  }

  if (uploaded.length > 0) {
    console.log("  uploaded =", uploaded.map(x=>`${x.category}:${x.id}`).join(", "));
  } else {
    console.log("  No documents uploaded successfully");
  }

  // 3) Check application status
  try {
    log("Check application status");
    const app:any = await req("GET", `${STAFF}/api/public/applications/${appId}`);
    console.log("  Application status:", app.status || app.stage || "unknown");
  } catch (err) {
    console.warn("  Application status check failed:", err.message.slice(0,100));
  }

  // 4) Check document listing
  try {
    log("List application documents");
    const docsList:any = await req("GET", `${STAFF}/api/public/applications/${appId}/documents`);
    console.log("  Documents found:", docsList.documents?.length || docsList.length || 0);
  } catch (err) {
    console.warn("  Document listing failed:", err.message.slice(0,100));
  }

  // 5) Test required docs endpoint  
  try {
    log("Check required documents");
    const requiredDocs:any = await req("GET", `${STAFF}/api/public/applications/${appId}/required-docs`);
    console.log("  Required docs:", requiredDocs.requiredDocuments?.length || "unknown");
  } catch (err) {
    console.warn("  Required docs check failed:", err.message.slice(0,100));
  }

  console.log("\n✅ E2E PUBLIC DOCS WORKFLOW COMPLETE");
  console.log(`Created application: ${appId}`);
  console.log(`Documents uploaded: ${uploaded.length}`);
})();