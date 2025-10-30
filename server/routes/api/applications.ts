import { ApplicationAny } from "../canonical/applicationVersioning";
import { logCanonicalMeta } from "../../middleware/traceId";
import { parseCanon } from './_canonIngest';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/drizzle';
import { applications } from '../../db/schema';

const router = Router();

const ApplicationSchema = z.object({
  // legacy flattened acceptance (optional while we transition)
  business_name: z.string().optional(),
  amount_requested: z.coerce.number().optional(),
  country: z.string().optional(),
  product_category: z.string().optional(),
  applicant_name: z.string().optional(),
  applicant_email: z.string().email().optional(),
  applicant_phone: z.string().optional(),
  
  // ApplicationV1 fields (maintaining compatibility)
  applicationId: z.string().optional(),
  businessLocation: z.string().optional(),
  headquarters: z.string().optional(),
  headquartersState: z.string().optional(),
  industry: z.string().optional(),
  lookingFor: z.string().optional(),
  fundingAmount: z.number().optional(),
  fundsPurpose: z.string().optional(),
  salesHistory: z.string().optional(),
  revenueLastYear: z.number().optional(),
  averageMonthlyRevenue: z.number().optional(),
  accountsReceivableBalance: z.number().optional(),
  fixedAssetsValue: z.number().optional(),
  equipmentValue: z.number().optional(),
  selectedCategory: z.string().nullable().optional(),
  
  // lossless carriers:
  application_canon: z.any().optional(),
  application_canon_version: z.string().optional(),
  application_field_count: z.coerce.number().optional(),
  application_canon_hash: z.string().optional(),
}).passthrough();

router.post('/', async (req: any, res: any) => {
  try {
    logCanonicalMeta(req);
    
    // Parse canonical data with enhanced metadata
    const { version, canonObj, canonJson, fieldCount, hash } = parseCanon(req.body || {});
    
    // Generate or use existing trace ID
    // @ts-ignore
    req.__traceId ||= req.headers['x-trace-id'] || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    
    console.log(`🚀 [apps] trace=${(req as any).__traceId} canon.len=${canonJson.length} fields=${fieldCount} hash=${hash}`);
    
    // Parse legacy fields for compatibility
    const input = ApplicationSchema.parse(req.body);

    // Map columns for quick querying using canonical data with fallbacks
    const mapped = {
      // Legacy patterns (from parsed input)
      business_name: input.business_name,
      
      // ApplicationV1 patterns (canonical first, then fallback)
      legal_business_name: canonObj.headquarters ?? canonObj.business_name ?? input.business_name ?? null,
      loan_amount: canonObj.fundingAmount ?? input.amount_requested ?? null,
      submission_country: canonObj.businessLocation ?? input.country ?? null,
      product_category: canonObj.lookingFor ?? input.product_category ?? null,
    };

    console.log('🔄 [ApplicationV1] Mapped columns:', JSON.stringify(mapped, null, 2));

    const [row] = await db.insert(applications).values({
      // Keep legacy fields for downstream compatibility
      ...mapped,
      
      // Lossless canonical payload with enhanced metadata
      application_canon: canonObj,
      application_canon_version: version,
      application_field_count: fieldCount,
      application_canon_hash: hash,
      createdAt: new Date(),
    }).returning({ id: applications.id });

    console.log(`✅ [MONITOR] Application created id=${row.id} fieldCount=${fieldCount} hash=${hash.slice(0,8)}...`);
    res.status(201).json({ success: true, id: row.id });
  } catch (err) {
    console.error('❌ Application submission error:', err);
    res.status(400).json({ error: 'Invalid application submission' });
  }
});

export default router;