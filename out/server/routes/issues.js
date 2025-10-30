import { Router } from "express";
import { requireAuth } from "../auth/verifyOnly";
const r = Router();
r.use(requireAuth);
/**
 * POST /api/issues/report
 * Client reports an issue
 */
r.post('/report', async (req, res) => {
    try {
        const { contactId, issue, name, email, type = 'issue' } = req.body;
        if (!issue) {
            return res.status(400).json({ error: 'Issue description is required' });
        }
        console.log(`🐛 [ISSUES] New issue reported: ${issue}`);
        // TODO: Create issue in database
        const issueId = `issue-${Date.now()}`;
        res.json({
            success: true,
            message: 'Issue reported successfully',
            issueId
        });
    }
    catch (error) {
        console.error('❌ [ISSUES] Error:', error);
        res.status(500).json({ error: 'Failed to report issue' });
    }
});
/**
 * GET /api/issues/:contactId
 */
r.get('/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const issues = [
            {
                id: 'issue-1',
                title: 'Application form not submitting',
                description: 'User unable to submit loan application form - button appears inactive.',
                status: 'open',
                severity: 'medium',
                reportedBy: 'john@example.com',
                createdAt: new Date().toISOString()
            }
        ];
        res.json({ success: true, issues });
    }
    catch (error) {
        console.error('❌ [ISSUES] Error:', error);
        res.status(500).json({ error: 'Failed to fetch issues' });
    }
});
/**
 * POST /api/issues/:id/reply
 */
r.post('/:id/reply', async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;
        if (!reply) {
            return res.status(400).json({ error: 'Reply is required' });
        }
        console.log(`💬 [ISSUES] Reply to issue ${id}: ${reply}`);
        res.json({
            success: true,
            message: 'Reply sent successfully'
        });
    }
    catch (error) {
        console.error('❌ [ISSUES] Error:', error);
        res.status(500).json({ error: 'Failed to send reply' });
    }
});
export default r;
