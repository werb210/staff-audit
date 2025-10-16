import { Router } from 'express';

const router = Router();

// Dashboard KPIs
router.get('/kpis', (req: any, res: any) => {
  const kpis = [
    {
      label: 'Active Applications',
      value: 23,
      change: 12.5,
      trend: 'up',
      period: '30d'
    },
    {
      label: 'Total Funding',
      value: '$2.4M',
      change: 8.7,
      trend: 'up',
      period: '30d'
    },
    {
      label: 'Conversion Rate',
      value: '18.2%',
      change: -2.1,
      trend: 'down',
      period: '30d'
    },
    {
      label: 'Active Contacts',
      value: 156,
      change: 15.3,
      trend: 'up',
      period: '30d'
    },
    {
      label: 'Pipeline Value',
      value: '$4.8M',
      change: 22.4,
      trend: 'up',
      period: '30d'
    },
    {
      label: 'Avg. Processing Time',
      value: '4.2 days',
      change: -8.3,
      trend: 'up',
      period: '30d'
    }
  ];

  res.json({
    ok: true,
    kpis,
    generated_at: new Date().toISOString()
  });
});

// Recent Activity
router.get('/activity', (req: any, res: any) => {
  const activities = [
    {
      id: '1',
      type: 'application',
      title: 'New Application Submitted',
      description: 'Acme Manufacturing - $250,000 equipment financing',
      timestamp: '2 minutes ago',
      priority: 'high',
      user: 'Maya Thompson',
      amount: 250000
    },
    {
      id: '2',
      type: 'call',
      title: 'Call Completed',
      description: 'Maya Thompson - discussed documentation requirements',
      timestamp: '15 minutes ago',
      duration: 420,
      outcome: 'completed'
    },
    {
      id: '3',
      type: 'email',
      title: 'Email Sent',
      description: 'Rate sheet sent to Quick Mart LLC',
      timestamp: '1 hour ago',
      recipient: 'leo@quickmart.biz',
      template: 'Rate Sheet'
    },
    {
      id: '4',
      type: 'task',
      title: 'Task Due Soon',
      description: 'Review equipment appraisal for Denver Construction',
      timestamp: '2 hours ago',
      priority: 'medium',
      due_at: '2025-08-22T16:00:00Z'
    },
    {
      id: '5',
      type: 'contact',
      title: 'New Contact Added',
      description: 'Leo Martinez from Quick Mart LLC',
      timestamp: '3 hours ago',
      source: 'Manual Entry'
    },
    {
      id: '6',
      type: 'application',
      title: 'Application Approved',
      description: 'Pro-Pipe Service - $400,000 line of credit',
      timestamp: '4 hours ago',
      amount: 400000,
      status: 'approved'
    },
    {
      id: '7',
      type: 'email',
      title: 'Document Request',
      description: 'Requested bank statements from Denver Construction',
      timestamp: '5 hours ago',
      recipient: 'ava@denvercon.com'
    },
    {
      id: '8',
      type: 'call',
      title: 'Voicemail Left',
      description: 'Follow-up call to Quick Mart LLC',
      timestamp: '6 hours ago',
      outcome: 'voicemail'
    }
  ];

  res.json({
    ok: true,
    activities,
    count: activities.length
  });
});

// Dashboard stats (alias for quick-stats to match frontend)
router.get('/stats', (req: any, res: any) => {
  const stats = {
    pending_tasks: 8,
    new_messages: 3,
    urgent_applications: 2,
    scheduled_calls: 5,
    overdue_tasks: 1,
    new_contacts: 12,
    active_campaigns: 4,
    response_rate: 0.234
  };

  res.json({
    ok: true,
    stats,
    generated_at: new Date().toISOString()
  });
});

// Quick Stats (keep original for compatibility)
router.get('/quick-stats', (req: any, res: any) => {
  const stats = {
    pending_tasks: 8,
    new_messages: 3,
    urgent_applications: 2,
    scheduled_calls: 5,
    overdue_tasks: 1,
    new_contacts: 12,
    active_campaigns: 4,
    response_rate: 0.234
  };

  res.json({
    ok: true,
    stats,
    generated_at: new Date().toISOString()
  });
});

// Dashboard Summary (comprehensive view)
router.get('/summary', (req: any, res: any) => {
  const { period = '30d' } = req.query;
  
  const summary = {
    period,
    overview: {
      applications: {
        total: 89,
        new: 23,
        in_review: 15,
        approved: 34,
        declined: 17,
        conversion_rate: 0.382
      },
      funding: {
        total_approved: 8750000,
        average_amount: 184000,
        largest_deal: 2500000,
        pending_value: 4200000
      },
      performance: {
        avg_processing_time: 4.2,
        response_time: 2.3,
        customer_satisfaction: 4.7,
        team_productivity: 0.89
      }
    },
    trends: {
      applications_by_week: [12, 18, 23, 19],
      funding_by_week: [1200000, 1800000, 2300000, 1900000],
      conversion_by_week: [0.35, 0.41, 0.38, 0.39]
    },
    top_performers: [
      { name: 'Sarah Wilson', applications: 34, funding: 2100000 },
      { name: 'Mike Chen', applications: 28, funding: 1800000 },
      { name: 'Alex Rodriguez', applications: 27, funding: 1650000 }
    ],
    alerts: [
      {
        type: 'warning',
        message: '2 applications approaching SLA deadline',
        action: 'Review applications'
      },
      {
        type: 'info', 
        message: 'New lender partnership available',
        action: 'Configure products'
      }
    ]
  };

  res.json({
    ok: true,
    summary,
    generated_at: new Date().toISOString()
  });
});

// Performance Metrics
router.get('/metrics', (req: any, res: any) => {
  const { user_id, team, period = '30d' } = req.query;
  
  const metrics = {
    user_id: user_id || 'current',
    period,
    individual: {
      applications_processed: 23,
      avg_processing_time: 3.8,
      conversion_rate: 0.43,
      customer_satisfaction: 4.8,
      revenue_generated: 1450000,
      tasks_completed: 67,
      calls_made: 89,
      emails_sent: 156
    },
    team_comparison: {
      rank: 2,
      total_members: 5,
      above_average: ['conversion_rate', 'customer_satisfaction'],
      below_average: ['processing_time'],
      improvement_areas: ['Follow-up timing', 'Documentation collection']
    },
    goals: {
      monthly_applications: { target: 25, actual: 23, percentage: 92 },
      conversion_rate: { target: 0.40, actual: 0.43, percentage: 107 },
      processing_time: { target: 3.0, actual: 3.8, percentage: 79 },
      revenue: { target: 1500000, actual: 1450000, percentage: 97 }
    }
  };

  res.json({
    ok: true,
    metrics,
    generated_at: new Date().toISOString()
  });
});

export default router;