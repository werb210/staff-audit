import { Router } from 'express';
const router = Router();
// Tasks endpoints
router.get('/', (req, res) => {
    const { all, assignee, status, due_before, due_after } = req.query;
    // Sample tasks data
    const allTasks = [
        {
            id: 't-bf-1',
            title: 'Send bank statements',
            description: 'Email bank statements to Maya at Acme Manufacturing',
            due_at: '2025-08-21T23:00:00Z',
            assignee_id: 'u-bf-admin',
            assignee_name: 'You',
            priority: 'high',
            status: 'open',
            relatedTo: {
                type: 'contact',
                id: 'ct-bf-001',
                name: 'Maya Thompson'
            },
            createdAt: '2024-08-20T10:00:00Z',
            tags: ['documentation', 'urgent']
        },
        {
            id: 't-bf-2',
            title: 'Follow up Quick Mart',
            description: 'Call Leo Martinez to discuss next steps in application process',
            due_at: '2025-08-24T17:00:00Z',
            assignee_id: 'u-bf-agent1',
            assignee_name: 'Sarah Wilson',
            priority: 'medium',
            status: 'in_progress',
            relatedTo: {
                type: 'application',
                id: 'app-bf-001',
                name: 'Quick Mart LLC Application'
            },
            createdAt: '2024-08-19T14:00:00Z',
            tags: ['follow-up', 'call']
        },
        {
            id: 't-bf-3',
            title: 'Review equipment appraisal',
            description: 'Analyze appraisal report for Denver Construction equipment financing',
            due_at: '2025-08-22T16:00:00Z',
            assignee_id: 'u-bf-admin',
            assignee_name: 'You',
            priority: 'medium',
            status: 'open',
            relatedTo: {
                type: 'application',
                id: 'app-bf-002',
                name: 'Denver Construction Application'
            },
            createdAt: '2024-08-21T09:00:00Z',
            tags: ['review', 'appraisal']
        },
        {
            id: 't-bf-4',
            title: 'Prepare lender presentation',
            description: 'Create presentation materials for monthly lender review',
            due_at: '2025-08-23T14:00:00Z',
            assignee_id: 'u-bf-manager',
            assignee_name: 'Mike Chen',
            priority: 'low',
            status: 'open',
            createdAt: '2024-08-20T16:30:00Z',
            tags: ['presentation', 'lender']
        },
        {
            id: 't-bf-5',
            title: 'Update CRM records',
            description: 'Sync latest contact information with CRM system',
            due_at: '2025-08-25T12:00:00Z',
            assignee_id: 'u-bf-agent2',
            assignee_name: 'Alex Rodriguez',
            priority: 'low',
            status: 'open',
            createdAt: '2024-08-21T11:00:00Z',
            tags: ['crm', 'maintenance']
        }
    ];
    let filteredTasks = allTasks;
    // Filter by assignee (if not showing all users)
    if (!all || all !== 'true') {
        filteredTasks = filteredTasks.filter(task => task.assignee_id === 'u-bf-admin');
    }
    // Filter by assignee if specified
    if (assignee) {
        filteredTasks = filteredTasks.filter(task => task.assignee_id === assignee);
    }
    // Filter by status
    if (status) {
        filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    // Filter by due date range
    if (due_before) {
        const beforeDate = new Date(due_before);
        filteredTasks = filteredTasks.filter(task => new Date(task.due_at) <= beforeDate);
    }
    if (due_after) {
        const afterDate = new Date(due_after);
        filteredTasks = filteredTasks.filter(task => new Date(task.due_at) >= afterDate);
    }
    res.json({
        ok: true,
        tasks: filteredTasks,
        count: filteredTasks.length,
        total: allTasks.length
    });
});
// Get single task
router.get('/:id', (req, res) => {
    const { id } = req.params;
    // Mock task detail
    const task = {
        id,
        title: 'Send bank statements',
        description: 'Email bank statements to Maya at Acme Manufacturing for equipment financing application',
        due_at: '2025-08-21T23:00:00Z',
        assignee_id: 'u-bf-admin',
        assignee_name: 'You',
        priority: 'high',
        status: 'open',
        relatedTo: {
            type: 'contact',
            id: 'ct-bf-001',
            name: 'Maya Thompson'
        },
        createdAt: '2024-08-20T10:00:00Z',
        updatedAt: '2024-08-21T08:30:00Z',
        tags: ['documentation', 'urgent'],
        comments: [
            {
                id: 'c1',
                author: 'You',
                text: 'Maya confirmed she can provide statements by end of day',
                createdAt: '2024-08-21T08:30:00Z'
            }
        ],
        attachments: [],
        time_tracked: 0
    };
    res.json({ ok: true, task });
});
// Create new task
router.post('/', (req, res) => {
    const { title, description, due_at, assignee_id, priority, relatedTo, tags } = req.body;
    if (!title || !due_at) {
        return res.status(400).json({
            ok: false,
            error: 'Title and due date are required'
        });
    }
    const newTask = {
        id: `t-bf-${Date.now()}`,
        title,
        description: description || '',
        due_at,
        assignee_id: assignee_id || 'u-bf-admin',
        assignee_name: assignee_id === 'u-bf-admin' ? 'You' : 'Team Member',
        priority: priority || 'medium',
        status: 'open',
        relatedTo: relatedTo || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: tags || [],
        comments: [],
        attachments: [],
        time_tracked: 0
    };
    res.json({
        ok: true,
        task: newTask,
        message: 'Task created successfully'
    });
});
// Update task
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    res.json({
        ok: true,
        message: `Task ${id} updated successfully`,
        task: {
            id,
            ...updates,
            updatedAt: new Date().toISOString()
        }
    });
});
// Update task status
router.patch('/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['open', 'in_progress', 'blocked', 'done'].includes(status)) {
        return res.status(400).json({
            ok: false,
            error: 'Invalid status'
        });
    }
    res.json({
        ok: true,
        message: `Task ${id} status updated to ${status}`,
        task: {
            id,
            status,
            updatedAt: new Date().toISOString()
        }
    });
});
// Add comment to task
router.post('/:id/comments', (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({
            ok: false,
            error: 'Comment text is required'
        });
    }
    const comment = {
        id: `c-${Date.now()}`,
        author: 'You', // Would come from auth
        text,
        createdAt: new Date().toISOString()
    };
    res.json({
        ok: true,
        comment,
        message: 'Comment added successfully'
    });
});
// Delete task
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    res.json({
        ok: true,
        message: `Task ${id} deleted successfully`
    });
});
// Bulk operations
router.patch('/bulk', (req, res) => {
    const { task_ids, action, data } = req.body;
    if (!task_ids || !Array.isArray(task_ids) || !action) {
        return res.status(400).json({
            ok: false,
            error: 'task_ids array and action are required'
        });
    }
    res.json({
        ok: true,
        message: `Bulk ${action} applied to ${task_ids.length} tasks`,
        affected_tasks: task_ids.length
    });
});
// O365 To Do integration
router.post('/o365/sync', (req, res) => {
    // This would sync with Microsoft Graph API
    res.json({
        ok: true,
        message: 'O365 To Do sync initiated',
        synced_tasks: 0,
        next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
});
router.get('/o365/status', (req, res) => {
    res.json({
        ok: true,
        connected: false, // Would check actual connection status
        last_sync: null,
        sync_enabled: false
    });
});
export default router;
