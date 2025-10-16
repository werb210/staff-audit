/**
 * 🎧 CUSTOMER SUPPORT API ROUTES
 * 
 * API endpoints for "Talk to a Human" and "Report an Issue" functionality
 * Handles support requests, issue tracking, and escalation management
 * 
 * Created: August 21, 2025
 */

import express from 'express';
const router = express.Router();

// Mock data storage (replace with database in production)
let supportRequests = [];
let issueReports = [];

/**
 * GET /api/communications/support-requests
 * Fetch all support requests for the Talk to Human tab
 */
router.get('/support-requests', async (req, res) => {
  try {
    // In production, fetch from database with pagination
    console.log('📞 [SUPPORT-REQUESTS] Fetching support request queue');
    
    const mockRequests = [
      {
        id: 'sup_' + Date.now() + '_1',
        customerName: 'John Smith',
        customerEmail: 'john@acmemanufacturing.com',
        priority: 'high',
        category: 'Application Status',
        subject: 'Questions about my loan application status',
        description: 'Hi, I submitted my equipment financing application 3 days ago and haven\'t heard back. Can someone please update me on the status?',
        status: 'assigned',
        assignedAgent: 'Sarah Thompson',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        estimatedWaitTime: '2 hours'
      },
      {
        id: 'sup_' + Date.now() + '_2',
        customerName: 'Mike Davis',
        customerEmail: 'mike@propipe.com',
        priority: 'medium',
        category: 'Documentation',
        subject: 'Need help with required documents',
        description: 'I\'m trying to complete my working capital application but I\'m not sure which bank statements you need. Can someone clarify?',
        status: 'pending',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        lastUpdate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        estimatedWaitTime: '4 hours'
      }
    ];

    res.json({
      success: true,
      requests: [...supportRequests, ...mockRequests],
      totalPending: mockRequests.filter(r => r.status === 'pending').length,
      totalInProgress: mockRequests.filter(r => r.status === 'in_progress').length,
      avgWaitTime: '3h 15m',
      satisfaction: 4.8
    });
  } catch (error) {
    console.error('❌ [SUPPORT-REQUESTS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support requests'
    });
  }
});

/**
 * POST /api/communications/support-requests
 * Create a new support request for customer escalation
 */
router.post('/support-requests', async (req, res) => {
  try {
    const { customerName, customerEmail, priority, category, subject, description } = req.body;
    
    console.log('📞 [SUPPORT-REQUEST-CREATE] New request:', { customerName, priority, category });
    
    if (!customerName || !customerEmail || !subject || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerName, customerEmail, subject, description'
      });
    }

    const newRequest = {
      id: 'sup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      customerName,
      customerEmail,
      priority: priority || 'medium',
      category: category || 'general',
      subject,
      description,
      status: 'pending',
      assignedAgent: null,
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      estimatedWaitTime: priority === 'urgent' ? '30 minutes' : priority === 'high' ? '2 hours' : '4 hours'
    };

    // Store in memory (replace with database insert in production)
    supportRequests.push(newRequest);

    // In production, trigger notifications to support team
    console.log('✅ [SUPPORT-REQUEST-CREATED] Request ID:', newRequest.id);

    res.status(201).json({
      success: true,
      ...newRequest
    });
  } catch (error) {
    console.error('❌ [SUPPORT-REQUEST-CREATE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create support request'
    });
  }
});

/**
 * GET /api/communications/issues
 * Fetch all issue reports for the Report an Issue tab
 */
router.get('/issues', async (req, res) => {
  try {
    console.log('🐛 [ISSUE-REPORTS] Fetching issue tracker');
    
    const mockIssues = [
      {
        id: 'issue_' + Date.now() + '_1',
        title: 'Application form not saving properly',
        description: 'When customers fill out the equipment financing form, their data is not being saved if they navigate away and come back.',
        category: 'bug',
        severity: 'high',
        status: 'in_progress',
        reportedBy: 'Sarah Thompson',
        assignedTo: 'Development Team',
        steps: '1. Go to equipment financing form\n2. Fill out customer details\n3. Navigate to different tab\n4. Come back to form\n5. Data is lost',
        expectedResult: 'Form data should be automatically saved and restored',
        actualResult: 'Form is blank when returning to the page',
        browserInfo: 'Chrome 127.0.6533.119',
        attachments: [],
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'issue_' + Date.now() + '_2',
        title: 'SMS notifications not being sent',
        description: 'Customers are not receiving SMS notifications when their loan application status changes.',
        category: 'bug',
        severity: 'critical',
        status: 'open',
        reportedBy: 'Mike Davis',
        steps: '1. Change application status to "Approved"\n2. SMS notification should be sent\n3. Customer does not receive SMS',
        expectedResult: 'Customer receives SMS notification about status change',
        actualResult: 'No SMS is sent',
        attachments: ['twilio-logs.txt'],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        lastUpdate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      }
    ];

    const allIssues = [...issueReports, ...mockIssues];

    res.json({
      success: true,
      issues: allIssues,
      stats: {
        open: allIssues.filter(i => i.status === 'open').length,
        inProgress: allIssues.filter(i => i.status === 'in_progress').length,
        resolved: allIssues.filter(i => i.status === 'resolved').length,
        critical: allIssues.filter(i => i.severity === 'critical').length
      }
    });
  } catch (error) {
    console.error('❌ [ISSUE-REPORTS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issues'
    });
  }
});

/**
 * POST /api/communications/issues
 * Create a new issue report for bug tracking and feature requests
 */
router.post('/issues', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      severity, 
      steps, 
      expectedResult, 
      actualResult,
      reportedBy,
      browserInfo 
    } = req.body;
    
    console.log('🐛 [ISSUE-CREATE] New issue:', { title, category, severity });
    
    if (!title || !description || !category || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, category, severity'
      });
    }

    const newIssue = {
      id: 'issue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title,
      description,
      category,
      severity,
      status: 'open',
      reportedBy: reportedBy || 'Current User',
      assignedTo: null,
      steps: steps || '',
      expectedResult: expectedResult || '',
      actualResult: actualResult || '',
      browserInfo: browserInfo || '',
      attachments: [],
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    };

    // Store in memory (replace with database insert in production)
    issueReports.push(newIssue);

    // In production, trigger notifications to development team
    console.log('✅ [ISSUE-CREATED] Issue ID:', newIssue.id);

    res.status(201).json({
      success: true,
      ...newIssue
    });
  } catch (error) {
    console.error('❌ [ISSUE-CREATE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create issue report'
    });
  }
});

/**
 * PATCH /api/communications/support-requests/:id/status
 * Update support request status (assign, resolve, close)
 */
router.patch('/support-requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedAgent } = req.body;
    
    console.log('📞 [SUPPORT-UPDATE] Updating request:', { id, status, assignedAgent });
    
    // Find and update request (replace with database update in production)
    const requestIndex = supportRequests.findIndex(r => r.id === id);
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Support request not found'
      });
    }

    supportRequests[requestIndex] = {
      ...supportRequests[requestIndex],
      status,
      assignedAgent: assignedAgent || supportRequests[requestIndex].assignedAgent,
      lastUpdate: new Date().toISOString()
    };

    res.json({
      success: true,
      ...supportRequests[requestIndex]
    });
  } catch (error) {
    console.error('❌ [SUPPORT-UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update support request'
    });
  }
});

/**
 * PATCH /api/communications/issues/:id/status
 * Update issue report status (assign, resolve, close)
 */
router.patch('/issues/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, resolution } = req.body;
    
    console.log('🐛 [ISSUE-UPDATE] Updating issue:', { id, status, assignedTo });
    
    // Find and update issue (replace with database update in production)
    const issueIndex = issueReports.findIndex(i => i.id === id);
    if (issueIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    issueReports[issueIndex] = {
      ...issueReports[issueIndex],
      status,
      assignedTo: assignedTo || issueReports[issueIndex].assignedTo,
      resolution: resolution || issueReports[issueIndex].resolution,
      lastUpdate: new Date().toISOString()
    };

    res.json({
      success: true,
      ...issueReports[issueIndex]
    });
  } catch (error) {
    console.error('❌ [ISSUE-UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update issue'
    });
  }
});

export default router;