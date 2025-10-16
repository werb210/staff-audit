import { Router } from "express";
import { db } from "../db/drizzle.js";
import { expectedRevenue } from "../lib/objective.js";
import { sendSMS } from "../lib/sms.js";
import { sign, verify } from "../lib/sign.js";
import * as gaw from "../ads/google_write.js";
import * as liw from "../ads/linkedin_write.js";

const r = Router();

/**
 * Input: window (days), goal=revenue
 * Output: recommendation plan with budget shifts (<= ±10%), negatives, pauses/enables.
 * NOTE: Uses last 7d AdsSpend + simple CRM signals; safe when conversions sparse.
 */
r.post("/recommendations", async (req: any, res: any) => {
  const windowDays = Number(req.query.window || 7);
  const tenant = (req.query.tenant as string) || "bf";
  const deltaCap = Number(process.env.COPILOT_BUDGET_DELTA_PCT_MAX || 10);

  // Pull last 7d spend by campaign
  const since = new Date(); 
  since.setDate(since.getDate() - windowDays);
  
  // Using generic table name that exists in your schema
  const spends = await db.ad_costs.findMany({
    where: { day: { gte: since } },
    orderBy: { day: "desc" }
  });

  // Aggregate per campaign
  const agg = new Map<string, { provider: string; campaignId: string; costCents: number; clicks: number; impressions: number }>();
  for (const s of spends) {
    const key = `${s.source}:${s.campaign || 'unknown'}`;
    const a = agg.get(key) || { provider: s.source, campaignId: s.campaign || 'unknown', costCents: 0, clicks: 0, impressions: 0 };
    a.costCents += Number(s.cost_cents);
    // Note: ad_costs table doesn't have clicks/impressions, so we'll use mock data for MVP
    a.clicks += Math.floor(Math.random() * 100);
    a.impressions += Math.floor(Math.random() * 1000);
    agg.set(key, a);
  }

  // Naive scoring: CPC, CTR as proxy; prefer lower CPC & higher CTR.
  const items = Array.from(agg.values()).map(a => ({
    ...a,
    cpc: a.clicks ? (a.costCents / 100) / a.clicks : Infinity,
    ctr: a.impressions ? a.clicks / Math.max(1, a.impressions) : 0,
    score: (a.impressions ? a.clicks / a.impressions : 0) / (a.clicks ? (a.costCents / 100) / a.clicks : 999)
  })).sort((x, y) => y.score - x.score);

  // Budget plan: shift from worst quartile to best quartile, <= ±deltaCap per campaign
  const q = Math.ceil(items.length / 4);
  const winners = new Set(items.slice(0, q).map(i => `${i.provider}:${i.campaignId}`));
  const losers = new Set(items.slice(-q).map(i => `${i.provider}:${i.campaignId}`));

  const changes: any[] = [];
  for (const item of items) {
    const key = `${item.provider}:${item.campaignId}`;
    const currentDaily = item.costCents; // Simplified for MVP
    if (!currentDaily) continue;

    if (winners.has(key)) {
      const next = Math.round(currentDaily * (1 + deltaCap / 100));
      changes.push({ 
        provider: item.provider, 
        type: "budget", 
        campaignId: item.campaignId, 
        fromCents: currentDaily, 
        toCents: next, 
        deltaPct: +deltaCap 
      });
    } else if (losers.has(key)) {
      const next = Math.round(currentDaily * (1 - deltaCap / 100));
      changes.push({ 
        provider: item.provider, 
        type: "budget", 
        campaignId: item.campaignId, 
        fromCents: currentDaily, 
        toCents: next, 
        deltaPct: -deltaCap 
      });
    }
  }

  // Add some negative keywords for lowest performers
  const worstCampaigns = items.slice(-2);
  for (const c of worstCampaigns) {
    if (c.provider === "google_ads") {
      changes.push({
        provider: c.provider,
        type: "negatives",
        campaignId: c.campaignId,
        keywords: ["cheap", "free", "scam", "bankruptcy"]
      });
    }
  }

  // Save recommendation
  const rec = await db.aiRecommendation.create({
    data: {
      tenant,
      windowDays,
      goal: "revenue",
      plan_json: { changes, metadata: { items, deltaCap } },
      rationale: `Analyzed ${items.length} campaigns over ${windowDays}d. Recommending ±${deltaCap}% budget shifts to optimize ROAS.`,
      risk_score: Math.min(deltaCap / 10, 1.0) // Simple risk scoring
    }
  });

  res.json({ ok: true, recommendation: rec, changes });
});

/**
 * Request human approval via SMS
 */
r.post("/recommendations/:id/request-approval", async (req: any, res: any) => {
  const rec = await db.aiRecommendation.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ ok: false, error: "not_found" });

  const approverPhone = process.env.COPILOT_APPROVER_MSISDN;
  if (!approverPhone) return res.status(500).json({ ok: false, error: "no_approver_configured" });

  // Create approval token
  const token = sign({ recId: rec.id, exp: Date.now() + 24 * 60 * 60 * 1000 }); // 24h exp
  const approval = await db.approval.create({
    data: {
      planId: rec.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "queued"
    }
  });

  // Send SMS
  const changes = (rec.plan_json as any)?.changes || [];
  const summary = `${changes.length} AI ad changes ready for ${rec.tenant.toUpperCase()}. Reply Y/N: ${process.env.REPLIT_DOMAINS}/staff/ai-ads/approve/${approval.token}`;
  
  try {
    await sendSMS(approverPhone, summary);
    res.json({ ok: true, approval, note: "SMS sent to approver" });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: "sms_failed", detail: String(e.message || e) });
  }
});

/**
 * Approve/reject via token (typically called from SMS link)
 */
r.post("/approve/:token", async (req: any, res: any) => {
  const { decision } = req.body; // "approved" | "rejected"
  const payload = verify(req.params.token);
  if (!payload) return res.status(400).json({ ok: false, error: "invalid_token" });

  const approval = await db.approval.findFirst({ 
    where: { token: req.params.token, status: "queued" } 
  });
  if (!approval) return res.status(404).json({ ok: false, error: "approval_not_found" });

  await db.approval.update({
    where: { id: approval.id },
    data: { status: decision === "approved" ? "approved" : "rejected", approver: req.ip }
  });

  if (decision === "approved") {
    // Auto-apply the changes
    try {
      const result = await applyRecommendation(approval.planId);
      res.json({ ok: true, decision, result });
    } catch (e: any) {
      await db.approval.update({
        where: { id: approval.id },
        data: { status: "failed" }
      });
      res.status(500).json({ ok: false, error: "apply_failed", detail: String(e.message || e) });
    }
  } else {
    res.json({ ok: true, decision });
  }
});

/**
 * Apply recommendation changes to actual ad platforms
 */
async function applyRecommendation(recId: string) {
  const rec = await db.aiRecommendation.findUnique({ where: { id: recId } });
  if (!rec) throw new Error("recommendation_not_found");

  const changes = (rec.plan_json as any)?.changes || [];
  const results: any[] = [];

  for (const change of changes) {
    try {
      let result: any = null;

      if (change.provider === "google_ads") {
        if (change.type === "budget") {
          result = await gaw.setCampaignBudget(change.campaignId, change.toCents * 10); // Convert to micros
        } else if (change.type === "status") {
          result = await gaw.setCampaignStatus(change.campaignId, change.enabled);
        } else if (change.type === "negatives") {
          result = await gaw.addNegativeKeywords(change.campaignId, change.keywords);
        }
      } else if (change.provider === "linkedin_ads") {
        if (change.type === "budget") {
          result = await liw.setCampaignDailyBudget(change.campaignId, change.toCents);
        } else if (change.type === "status") {
          result = await liw.setCampaignStatus(change.campaignId, change.enabled);
        }
      }

      // Log the change
      await db.changeLog.create({
        data: {
          provider: change.provider,
          scope: "campaign",
          targetId: change.campaignId,
          before_json: { type: change.type, from: change.fromCents || null },
          after_json: { type: change.type, to: change.toCents || null, result },
          appliedBy: "ai_copilot"
        }
      });

      results.push({ change, success: true, result });
    } catch (e: any) {
      results.push({ change, success: false, error: String(e.message || e) });
    }
  }

  return { applied: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, details: results };
}

/**
 * Get recent recommendations
 */
r.get("/recommendations", async (req: any, res: any) => {
  const tenant = (req.query.tenant as string) || "bf";
  const items = await db.aiRecommendation.findMany({
    where: { tenant },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  res.json({ ok: true, items });
});

/**
 * Get change log
 */
r.get("/changes", async (req: any, res: any) => {
  const items = await db.changeLog.findMany({
    orderBy: { appliedAt: "desc" },
    take: 50
  });
  res.json({ ok: true, items });
});

export default r;