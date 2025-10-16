import { Router } from "express";
import { requireRole } from "../security/rbac";
import { audit } from "../services/audit";

const router = Router();

/** GET /api/lender/apps  — Off-to-Lender apps for the signed-in lender */
router.get("/", requireRole(["lender","manager","admin"]), async (req:any, res) => {
  const lenderId = req.user?.lenderId || req.user?.id; // support either style
  const items = await req.app.locals.db.apps.listForLender(lenderId);
  // Attach minimal docs/OCR if you have them; stubbed empty for now
  res.json({ items, meta: { count: items.length } });
});

/** POST /api/lender/apps/:appId/accept  — marks Accepted (funds disbursed) */
router.post("/:appId/accept", requireRole(["lender","manager","admin"]), async (req:any, res) => {
  const { appId } = req.params;
  const { amount } = req.body || {};
  const app = await req.app.locals.db.apps.get(appId);
  if (!app) return res.status(404).json({ error: "not_found" });
  if (app.stage !== "Off to Lender") return res.status(409).json({ error: "bad_stage" });

  // Advance to Accepted only on funds disbursed (your rule)
  const updated = await req.app.locals.db.apps.update(appId, { stage: "Accepted", outcome: "Accepted", fundedAmount: Number(amount)||0 });

  // Enhanced triggers with pipeline SMS service
  try {
    const { smsOnFundsDisbursed } = await import("../services/pipelineSms");
    await smsOnFundsDisbursed({ contactPhone: app.contactPhone ?? "", amount: updated.fundedAmount });
  } catch (e) { console.error("[SMS funds]", e); }

  // Optional: email via O365 (stub)
  try {
    console.log(`[EMAIL] Funds disbursed — ${app.businessName}. App ${app.id} marked Accepted. Amount: ${updated.fundedAmount || "n/a"}.`);
  } catch {}

  // Audit logging
  audit.log({ actor: req.user?.email, action: "pipeline:accepted", details: { appId, amount: updated.fundedAmount } });

  res.json({ ok: true, app: updated });
});

/** POST /api/lender/apps/:appId/decline */
router.post("/:appId/decline", requireRole(["lender","manager","admin"]), async (req:any, res) => {
  const { appId } = req.params;
  const { reason } = req.body || {};
  const app = await req.app.locals.db.apps.get(appId);
  if (!app) return res.status(404).json({ error: "not_found" });
  if (app.stage !== "Off to Lender") return res.status(409).json({ error: "bad_stage" });

  const updated = await req.app.locals.db.apps.update(appId, { stage: "Declined", outcome: "Declined" });

  try { 
    console.log(`[SMS] Application declined to ${app.contactPhone}`);
  } catch (e) { console.error("[SMS decline]", e); }

  // Optional: email
  try {
    console.log(`[EMAIL] Declined — ${app.businessName}. App ${app.id} declined. Reason: ${reason || "n/a"}.`);
  } catch {}

  // Audit logging
  audit.log({ actor: req.user?.email, action: "pipeline:declined", details: { appId } });

  res.json({ ok: true, app: updated });
});

export default router;