#!/usr/bin/env tsx
import { db } from '../../server/db/drizzle';
import { applications } from '../../server/db/schema';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import * as fs from 'fs';
/** Adjust to your actual schema import or generate with zod-to-json: */
const ApplicationSchema = z.object({
  business_name: z.string().optional(),
  amount_requested: z.number().optional(),
  country: z.string().optional(),
  product_category: z.string().optional(),
  applicant_email: z.string().optional(),
  // ...add the rest you accept in API (or import from your code)
});
const accepted = new Set(Object.keys((ApplicationSchema as any)._def.shape()));
(async ()=>{
  const rows = await db.select().from(applications).orderBy(desc(applications.created_at)).limit(10);
  for (const r of rows) {
    const canon = (r as any).applicationCanon ?? {};
    const received = new Set(Object.keys(canon));
    const missing = [...accepted].filter(k => !received.has(k));
    console.log(`[${(r as any).id}] missing_from_canon: ${missing.length} -> ${missing.join(',')}`);
  }
})();