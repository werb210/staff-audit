import { Router } from 'express';
import { queueApproval } from '../lib/approvals';
const router = Router();
// Create an approval request
router.post('/approvals/request', async (req, res) => {
    try {
        const tenant = req.tenant || 'bf';
        const { contactId, applicationId, channel, action, toAddress, preview, body, meta } = req.body || {};
        if (!channel || !action || !preview) {
            return res.status(400).json({
                ok: false,
                error: 'missing_fields',
                message: 'channel, action, and preview are required'
            });
        }
        const ar = await queueApproval({
            tenant,
            contactId,
            applicationId,
            channel,
            action,
            toAddress,
            preview,
            body,
            meta,
            createdBy: req.user?.id
        });
        await logActivity({
            tenant,
            type: 'approval_requested',
            contactId: contactId || undefined,
            applicationId: applicationId || undefined,
            tags: ['approval', 'queued', channel, action],
            meta: {
                approvalId: ar.id,
                code: ar.code,
                preview,
                toAddress
            }
        });
        res.json({
            ok: true,
            approvalId: ar.id,
            code: ar.code,
            status: ar.status
        });
    }
    catch (error) {
        console.error('Approval request error:', error);
        res.status(500).json({
            ok: false,
            error: 'internal_error',
            message: 'Failed to create approval request'
        });
    }
});
export default router;
