import { Router } from 'express';
import crypto from 'crypto';
import { smsOnStage, smsOnFundsDisbursed } from '../services/pipelineSms';
// REMOVED: logStageTransition (not exported from pipelineSms)
const router = Router();
// Simple in-memory idempotency ledger; swap to DB in production
const seenKeys = new Set();
function createIdempotencyKey(appId, outcome, fundsDisbursed, amount, key) {
    const data = `${appId}:${outcome}:${fundsDisbursed ? 1 : 0}:${amount ?? "na"}:${key ?? "na"}`;
    return crypto.createHash("sha256").update(data).digest("hex");
}
/**
 * POST /api/lenders/outcome
 * Body: { appId: string, outcome: "Accepted"|"Declined", reason?: string, fundsDisbursed?: boolean, amount?: number, idempotencyKey?: string }
 * Used for API integrations and manual staff actions
 */
router.post('/outcome', async (req, res) => {
    try {
        const { appId, outcome, reason, fundsDisbursed = false, amount, idempotencyKey } = req.body || {};
        if (!appId || !outcome) {
            return res.status(400).json({ error: "missing_fields", message: "appId and outcome are required" });
        }
        if (!["Accepted", "Declined"].includes(outcome)) {
            return res.status(400).json({ error: "invalid_outcome", message: "outcome must be Accepted or Declined" });
        }
        // Idempotency check
        const key = createIdempotencyKey(appId, outcome, fundsDisbursed, amount, idempotencyKey);
        if (seenKeys.has(key)) {
            return res.json({ ok: true, idempotent: true });
        }
        seenKeys.add(key);
        // Mock application lookup - replace with actual database query
        const mockApp = {
            id: appId,
            contactId: "contact-1",
            companyName: "Example Business",
            currentStage: "Off to Lender"
        };
        const mockContact = {
            phone: "+15551234567",
            firstName: "John"
        };
        if (outcome === "Declined") {
            // Move to Declined stage and send SMS
            // REMOVED: logStageTransition call (function not exported)
            await smsOnStage("Declined", {
                contactPhone: mockContact.phone,
                firstName: mockContact.firstName
            });
            console.log(`[LENDER-OUTCOME] Application ${appId} declined: ${reason}`);
            return res.json({ ok: true, stage: "Declined" });
        }
        if (outcome === "Accepted") {
            if (fundsDisbursed) {
                // Funds disbursed - move to Accepted and send disbursement SMS
                // REMOVED: logStageTransition call (function not exported)
                await smsOnFundsDisbursed({
                    contactPhone: mockContact.phone,
                    amount
                });
                console.log(`[LENDER-OUTCOME] Application ${appId} accepted with disbursement: $${amount || 'unknown'}`);
                return res.json({ ok: true, stage: "Accepted", fundsDisbursed: true });
            }
            else {
                // Offer accepted but funds not disbursed yet - stay in "Off to Lender"
                console.log(`[LENDER-OUTCOME] Application ${appId} offer accepted, awaiting disbursement`);
                // Log the acceptance without moving stages
                // REMOVED: logStageTransition call (function not exported)
                return res.json({ ok: true, stage: "Off to Lender", offerAccepted: true });
            }
        }
        return res.status(400).json({ error: "invalid_outcome" });
    }
    catch (error) {
        console.error('[LENDER-OUTCOME] Error processing outcome:', error);
        return res.status(500).json({ error: "server_error", message: error instanceof Error ? error.message : String(error) });
    }
});
/**
 * POST /api/lenders/webhook
 * Accepts arbitrary partner payloads and maps to internal outcome format
 * Expected fields: { referenceId, status, amount, fundsReleasedAt, eventId }
 */
router.post('/webhook', async (req, res) => {
    try {
        const payload = req.body || {};
        console.log('[LENDER-WEBHOOK] Received payload:', payload);
        // Map partner fields to internal format
        const appId = payload.referenceId || payload.appId || payload.applicationId;
        const status = String(payload.status || '').toLowerCase();
        // Map status to outcome
        let outcome = null;
        if (status.includes('declin') || status.includes('reject')) {
            outcome = "Declined";
        }
        else if (status.includes('accept') || status.includes('approv') || status.includes('fund') || status.includes('disburs')) {
            outcome = "Accepted";
        }
        if (!appId || !outcome) {
            console.warn('[LENDER-WEBHOOK] Unable to map payload to outcome:', { appId, status, outcome });
            return res.status(400).json({ error: "unmapped_payload", received: { appId, status } });
        }
        // Determine if funds are disbursed
        const fundsDisbursed = !!(payload.fundsReleasedAt ||
            payload.disbursed ||
            payload.fundsDisbursed ||
            status.includes('fund') ||
            status.includes('disburs'));
        const amount = Number(payload.amount || payload.fundsAmount || payload.disbursementAmount || 0) || undefined;
        // Create synthetic request to reuse outcome handler
        const syntheticReq = {
            ...req,
            body: {
                appId,
                outcome,
                fundsDisbursed,
                amount,
                reason: payload.reason || payload.note || payload.message,
                idempotencyKey: payload.eventId || payload.id || payload.hash || payload.webhookId
            }
        };
        // Process through outcome logic by calling the outcome handler directly
        const outcomeHandler = router.stack.find(layer => layer.route?.path === '/outcome' && layer.route?.methods?.post);
        if (outcomeHandler) {
            return outcomeHandler.handle(syntheticReq, res);
        }
        else {
            // Fallback: manually process the outcome
            const { appId, outcome, fundsDisbursed, amount, reason, idempotencyKey } = syntheticReq.body;
            const key = createIdempotencyKey(appId, outcome, fundsDisbursed, amount, idempotencyKey);
            if (seenKeys.has(key)) {
                return res.json({ ok: true, idempotent: true });
            }
            seenKeys.add(key);
            if (outcome === "Declined") {
                console.log(`[WEBHOOK-OUTCOME] Application ${appId} declined via webhook`);
                return res.json({ ok: true, stage: "Declined" });
            }
            else if (outcome === "Accepted") {
                console.log(`[WEBHOOK-OUTCOME] Application ${appId} accepted via webhook, funds disbursed: ${fundsDisbursed}`);
                return res.json({ ok: true, stage: fundsDisbursed ? "Accepted" : "Off to Lender" });
            }
            return res.json({ ok: true, processed: true });
        }
    }
    catch (error) {
        console.error('[LENDER-WEBHOOK] Error processing webhook:', error);
        // Always return success to partner webhooks to avoid retries
        return res.status(200).json({ ok: true, processed: false, error: error instanceof Error ? error.message : String(error) });
    }
});
/**
 * GET /api/lenders/outcomes/health
 * Health check for lender outcome system
 */
router.get('/outcomes/health', (req, res) => {
    res.json({
        ok: true,
        service: "lender_outcomes",
        endpoints: [
            "POST /api/lenders/outcome",
            "POST /api/lenders/webhook"
        ],
        idempotencyKeys: seenKeys.size
    });
});
export default router;
