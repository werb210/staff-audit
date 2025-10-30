import { queueApproval } from '../lib/approvals';
/**
 * Middleware to ensure approval or queue actions that contact clients
 * If X-Approved-By-User header is set to "true", action proceeds
 * Otherwise, action is queued for SMS approval
 */
export async function ensureApprovalOrQueue(req, res, next) {
    try {
        // If explicitly marked as already approved by UI, let it through
        if (req.headers['x-approved-by-user'] === 'true') {
            return next();
        }
        // Otherwise, queue approval and short-circuit
        const { contactId, applicationId, channel, action, toAddress, preview, body, meta } = req.body || {};
        if (!channel || !action) {
            return res.status(400).json({
                ok: false,
                error: 'missing_channel_or_action_for_approval',
                message: 'channel and action are required for approval workflow'
            });
        }
        const ar = await queueApproval({
            tenant: req.tenant || 'bf',
            contactId,
            applicationId,
            channel,
            action,
            toAddress,
            preview: preview || `${action} for contact ${contactId || ''}`,
            body: body || '',
            meta,
            createdBy: req.user?.id
        });
        return res.status(202).json({
            ok: true,
            queued: true,
            approvalId: ar.id,
            code: ar.code,
            message: `Action queued for approval. SMS sent to approver with code ${ar.code}.`
        });
    }
    catch (error) {
        console.error('Approval queueing error:', error);
        return res.status(500).json({
            ok: false,
            error: 'approval_queue_failed',
            message: 'Failed to queue action for approval'
        });
    }
}
/**
 * Middleware specifically for SMS messaging routes
 */
export async function requireSMSApproval(req, res, next) {
    // Set default channel and action for SMS
    if (!req.body.channel)
        req.body.channel = 'sms';
    if (!req.body.action)
        req.body.action = 'send_message';
    return ensureApprovalOrQueue(req, res, next);
}
/**
 * Middleware specifically for email messaging routes
 */
export async function requireEmailApproval(req, res, next) {
    // Set default channel and action for email
    if (!req.body.channel)
        req.body.channel = 'email';
    if (!req.body.action)
        req.body.action = 'send_message';
    return ensureApprovalOrQueue(req, res, next);
}
/**
 * Middleware specifically for LinkedIn messaging routes
 */
export async function requireLinkedInApproval(req, res, next) {
    // Set default channel and action for LinkedIn
    if (!req.body.channel)
        req.body.channel = 'linkedin';
    if (!req.body.action)
        req.body.action = 'send_message';
    return ensureApprovalOrQueue(req, res, next);
}
// Legacy compatibility - keep for existing code that may use this
export function requireHumanApprovalForContact(req, res, next) {
    return ensureApprovalOrQueue(req, res, next);
}
