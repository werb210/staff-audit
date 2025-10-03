import { Router } from 'express';

const router = Router();

// Calendar events endpoints
router.get('/events', (req: any, res: any) => {
  const { date } = req.query;
  
  // Sample events data for testing
  const events = [
    {
      id: 'ev-bf-1',
      title: 'Call Maya (docs)',
      start: '2025-08-21T10:00:00Z',
      end: '2025-08-21T10:30:00Z',
      ownerId: 'u-bf-admin',
      owner_name: 'You',
      type: 'call',
      description: 'Discuss missing documentation requirements',
      attendees: ['maya@acme.com'],
      location: 'Virtual',
      status: 'confirmed'
    },
    {
      id: 'ev-bf-2',
      title: 'Lender review meeting',
      start: '2025-08-22T18:00:00Z',
      end: '2025-08-22T19:00:00Z',
      ownerId: 'u-bf-agent1',
      owner_name: 'Sarah Wilson',
      type: 'meeting',
      description: 'Weekly lender portfolio review',
      attendees: ['sarah@borealfinancial.com', 'mike@borealfinancial.com'],
      location: 'Conference Room A',
      status: 'confirmed'
    },
    {
      id: 'ev-bf-3',
      title: 'Team standup',
      start: '2025-08-21T09:00:00Z',
      end: '2025-08-21T09:30:00Z',
      ownerId: 'u-bf-manager',
      owner_name: 'Mike Chen',
      type: 'meeting',
      description: 'Daily team sync meeting',
      attendees: ['team@borealfinancial.com'],
      location: 'Main Office',
      status: 'confirmed'
    },
    {
      id: 'ev-bf-4',
      title: 'Client presentation prep',
      start: '2025-08-23T14:00:00Z',
      end: '2025-08-23T15:30:00Z',
      ownerId: 'u-bf-admin',
      owner_name: 'You',
      type: 'task',
      description: 'Prepare presentation materials for Denver Construction',
      status: 'tentative'
    }
  ];

  // Filter by date if provided
  let filteredEvents = events;
  if (date) {
    const filterDate = new Date(date);
    filteredEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === filterDate.toDateString();
    });
  }

  res.json({
    ok: true,
    events: filteredEvents,
    count: filteredEvents.length
  });
});

// Create new event
router.post('/events', (req: any, res: any) => {
  const { title, start, end, type, description, attendees, location } = req.body;
  
  const newEvent = {
    id: `ev-bf-${Date.now()}`,
    title,
    start,
    end,
    ownerId: 'u-bf-admin', // Would come from auth
    owner_name: 'You',
    type: type || 'meeting',
    description: description || '',
    attendees: attendees || [],
    location: location || '',
    status: 'confirmed',
    created_at: new Date().toISOString()
  };

  res.json({
    ok: true,
    event: newEvent,
    message: 'Event created successfully'
  });
});

// Update event
router.put('/events/:id', (req: any, res: any) => {
  const { id } = req.params;
  const updates = req.body;
  
  res.json({
    ok: true,
    message: `Event ${id} updated successfully`,
    event: { id, ...updates, updated_at: new Date().toISOString() }
  });
});

// Delete event
router.delete('/events/:id', (req: any, res: any) => {
  const { id } = req.params;
  
  res.json({
    ok: true,
    message: `Event ${id} deleted successfully`
  });
});

// O365 Integration endpoints
router.post('/o365/sync', (req: any, res: any) => {
  // This would sync with Microsoft Graph API
  res.json({
    ok: true,
    message: 'O365 calendar sync initiated',
    synced_events: 0,
    next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
});

router.get('/o365/status', (req: any, res: any) => {
  res.json({
    ok: true,
    connected: false, // Would check actual connection status
    last_sync: null,
    sync_enabled: false
  });
});

export default router;