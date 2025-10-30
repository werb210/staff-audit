import { Router } from 'express';
const router = Router();
// Get communications for contacts
router.get('/', async (req, res) => {
    try {
        const { type, contactId } = req.query;
        // Mock communications data - replace with actual DB queries
        const communications = [
            {
                id: 'comm-1',
                contactId: 'contact-1',
                type: 'sms',
                direction: 'outbound',
                content: 'Welcome to Boreal Financial!',
                status: 'delivered',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'comm-2',
                contactId: 'contact-1',
                type: 'email',
                direction: 'outbound',
                subject: 'Your Application Status',
                content: 'Thank you for your loan application...',
                status: 'sent',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'comm-3',
                contactId: 'contact-2',
                type: 'sms',
                direction: 'inbound',
                content: 'Thanks for the update',
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
            }
        ];
        let filtered = communications;
        if (type)
            filtered = filtered.filter(c => c.type === type);
        if (contactId)
            filtered = filtered.filter(c => c.contactId === contactId);
        res.json({ success: true, items: filtered });
    }
    catch (error) {
        console.error('Communications fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch communications' });
    }
});
// Send communication
router.post('/', async (req, res) => {
    try {
        const { contactId, type, content, subject } = req.body;
        const communication = {
            id: `comm-${Date.now()}`,
            contactId,
            type,
            direction: 'outbound',
            content,
            subject: type === 'email' ? subject : undefined,
            status: 'sent',
            timestamp: new Date().toISOString()
        };
        res.json({ success: true, item: communication });
    }
    catch (error) {
        console.error('Communication send error:', error);
        res.status(500).json({ success: false, error: 'Failed to send communication' });
    }
});
export default router;
