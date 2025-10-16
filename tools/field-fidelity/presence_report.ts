#!/usr/bin/env tsx
import { db } from '../../server/db/drizzle';
import { applications } from '../../server/db/schema';
import { desc } from 'drizzle-orm';
const REQUIRED: Record<string,string[]> = {
  AcceptedViaAPI: ['business.businessName','financial.requestedAmount','business.country','product.selectedCategory','applicant.email'],
  PipelineCard:   ['business.businessName','financial.requestedAmount','business.industry','status'],
  PDFGenerator:   ['business.businessName','financial.requestedAmount','financial.annualRevenue','applicant.email','applicant.phone'],
  CreditSummary:  ['business.businessName','financial.requestedAmount','financial.annualRevenue','business.yearsInBusiness','business.country','fundsPurpose'],
  LenderExport:   ['applicant.email','business.businessName','financial.requestedAmount','product.selectedCategory','business.country'],
};
function get(obj:any,p:string){return p.split('.').reduce((o,k)=>o?.[k],obj);}
(async ()=>{
  const rows = await db.select().from(applications).orderBy(desc(applications.created_at)).limit(10);
  for (const r of rows) {
    const canon = (r as any).applicationCanon ?? {};
    console.log(`\n[${(r as any).id}] v=${(r as any).applicationCanonVersion} fields=${(r as any).applicationFieldCount}`);
    for (const [stage, fields] of Object.entries(REQUIRED)) {
      const present = fields.filter(f => get(canon, f) != null);
      const pct = Math.round((present.length/fields.length)*100);
      const miss = fields.filter(f=>!present.includes(f));
      console.log(`  ${stage}: ${present.length}/${fields.length} (${pct}%) missing=[${miss.join(', ')}]`);
    }
  }
})();