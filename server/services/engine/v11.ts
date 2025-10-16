import { db } from "../../db";
import { sql } from "drizzle-orm";

type AppRow = { id:string; amount_requested?:number; product_category?:string; monthly_revenue?:number; time_in_biz_months?:number; industry?:string; credit_score?:number };

export async function getVariantWeights(variant:string){
  const r = await db.execute(sql`SELECT weights FROM engine_variants WHERE key=${variant} LIMIT 1`);
  const w = r.rows?.[0]?.weights || null;
  if (w) return w;
  return {
    amount: Number(process.env.ENGINE_WEIGHT_AMOUNT || 0.25),
    mrr:    Number(process.env.ENGINE_WEIGHT_MRR || 0.35),
    tib:    Number(process.env.ENGINE_WEIGHT_TIB || 0.20),
    cs:     Number(process.env.ENGINE_WEIGHT_CS || 0.20),
  };
}

function clamp01(n:number){ return Math.max(0, Math.min(1, n)); }
function round2(n:number){ return Math.round(n*100)/100; }

function evalPolicies(scopeRules:string[], a:AppRow, p:any){
  // naive policy parser for simple constraints like "min_credit_score>=600" or JSON arrays
  const hits:any[] = [];
  let eligibleOverride: boolean | undefined = undefined;

  for(const rule of scopeRules){
    const r = rule.trim();
    if (!r) continue;

    if (r.startsWith("min_credit_score>=")){
      const min = Number(r.split(">=")[1]);
      const ok = (a.credit_score||0) >= min;
      hits.push({ rule:r, ok, data:{min} });
      if (!ok) eligibleOverride = false;
      continue;
    }
    if (r.startsWith("min_monthly_revenue>=")){
      const min = Number(r.split(">=")[1]);
      const ok = (a.monthly_revenue||0) >= min;
      hits.push({ rule:r, ok, data:{min} });
      if (!ok) eligibleOverride = false;
      continue;
    }
    if (r.startsWith("block_industries")){
      try {
        const arr = JSON.parse(r.split("=")[1]);
        const blocked = Array.isArray(arr) ? arr.includes(String(a.industry||"")) : false;
        hits.push({ rule:r, ok: !blocked, data:{blocked} });
        if (blocked) eligibleOverride = false;
      } catch { hits.push({ rule:r, ok:true }); }
      continue;
    }
    // passthrough
    hits.push({ rule:r, ok:true });
  }

  return { hits, eligibleOverride };
}

export async function runEngine11(applicationId: string, variant="prod"){
  const a = (await db.execute(sql`
    SELECT a.id, a.amount_requested, a.product_category, a.monthly_revenue, a.time_in_biz_months, a.industry, a.credit_score
    FROM applications a WHERE a.id=${applicationId} LIMIT 1
  `)).rows?.[0] as AppRow;
  if (!a) throw new Error("application not found");

  const weights = await getVariantWeights(variant);
  const products = (await db.execute(sql`SELECT * FROM lender_products ORDER BY created_at`)).rows || [];
  const policies = (await db.execute(sql`
    SELECT scope, rule FROM engine_policies
    WHERE scope IN ('global', 'application:${applicationId}')
       OR scope IN (SELECT 'product:'||key FROM lender_products)
  `)).rows || [];

  const policyByScope:Record<string,string[]> = {};
  for (const r of policies){ (policyByScope[r.scope] ||= []).push(r.rule); }

  const results:any[] = [];
  const rulesApplied:any[] = [];
  const inputs = { amount:a.amount_requested, mrr:a.monthly_revenue, tib:a.time_in_biz_months, ind:a.industry, cs:a.credit_score };

  for (const p of products){
    const reasons:string[] = [];
    let eligible = true;

    // base constraints from product row
    function fail(cond:boolean, why:string){ if (cond) { eligible=false; reasons.push(why); } }
    fail(p.min_amount   != null && a.amount_requested! < Number(p.min_amount),   `amount < min (${p.min_amount})`);
    fail(p.max_amount   != null && a.amount_requested! > Number(p.max_amount),   `amount > max (${p.max_amount})`);
    fail(p.min_monthly_revenue != null && (a.monthly_revenue||0) < Number(p.min_monthly_revenue), `MRR < min (${p.min_monthly_revenue})`);
    fail(p.min_time_in_biz_months != null && (a.time_in_biz_months||0) < Number(p.min_time_in_biz_months), `TIB < min (${p.min_time_in_biz_months})`);
    fail(p.min_credit_score != null && (a.credit_score||0) < Number(p.min_credit_score), `CS < min (${p.min_credit_score})`);
    if (p.industries_allowed && p.industries_allowed.length) fail(!(p.industries_allowed as string[]).includes(String(a.industry||"")), "industry not allowed");
    if (p.industries_blocked && p.industries_blocked.length) fail((p.industries_blocked as string[]).includes(String(a.industry||"")), "industry blocked");

    // policy overrides
    const scopes = ["global", `product:${p.key}`, `application:${a.id}`];
    for (const sc of scopes){
      const { hits, eligibleOverride } = evalPolicies(policyByScope[sc] || [], a, p);
      if (hits.length) rulesApplied.push({ scope: sc, product: p.key, hits });
      if (eligibleOverride === false) eligible = false;
    }

    // knobs
    const k = (p.knobs || {}) as any;
    const boost = Number(k.score_boost || 0);               // e.g., +0.05
    const penalty = Number(k.out_of_box_penalty || 0);      // e.g., -0.10

    // score with variant weights
    const fAmount = clamp01((Number(a.amount_requested||0) - Number(p.min_amount||0)) / Math.max(1, Number((p.max_amount||p.min_amount||1)) - Number(p.min_amount||0)));
    const fMrr    = clamp01((Number(a.monthly_revenue||0) / Math.max(1, Number(p.min_monthly_revenue||1))));
    const fTib    = clamp01((Number(a.time_in_biz_months||0) / Math.max(1, Number(p.min_time_in_biz_months||1))));
    const fCs     = clamp01((Number(a.credit_score||0) - Number(p.min_credit_score||0)) / 200);
    let score = eligible ? (weights.amount*fAmount + weights.mrr*fMrr + weights.tib*fTib + weights.cs*fCs) : 0;
    score = score + boost - penalty;
    score = round2(clamp01(score));

    results.push({
      productKey: p.key, productName: p.name, eligible, score, reasons,
      offer: eligible ? { apr: p.rate_apr, term_months: p.term_months } : null,
      knobs: k
    });
  }

  const ranked = results.filter(r=>r.eligible).sort((a,b)=> b.score - a.score);
  await db.execute(sql`
    INSERT INTO decision_traces(application_id, variant, results, rules_applied, inputs)
    VALUES (${applicationId}, ${variant}, ${JSON.stringify(ranked)}, ${JSON.stringify(rulesApplied)}, ${JSON.stringify(inputs)})
  `);

  return { applicationId, variant, weights, top: ranked.slice(0,5), all: results, rulesApplied, inputs };
}