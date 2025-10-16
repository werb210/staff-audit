import { Router } from 'express';
import { db } from '../db';
import { applications, documents, users, lenderUsers, contacts, smsMessages, callLogs, emailMessages } from '../../shared/schema';
import { eq, and, gte, lte, count, sql, desc } from 'drizzle-orm';
import { developmentAuth } from '../middleware/rbac';

const router = Router();

/**
 * 📊 ANALYTICS DASHBOARD ENDPOINTS
 * Comprehensive analytics for Boreal Financial production system
 */

// GET /api/reports/dashboard-summary - Main dashboard metrics
router.get('/dashboard-summary', developmentAuth, async (req: any, res: any) => {
  try {
    console.log('📊 [ANALYTICS] Generating dashboard summary');

    // Get key metrics from all tables using raw SQL to handle enum issues
    const [totalApplications] = await db.execute(sql`
      SELECT cast(count(*) as int) as count 
      FROM applications
    `);

    const [activeApplications] = await db.execute(sql`
      SELECT cast(count(*) as int) as count 
      FROM applications 
      WHERE status::text IN ('pending', 'processing')
    `);

    const [completedApplications] = await db.execute(sql`
      SELECT cast(count(*) as int) as count 
      FROM applications 
      WHERE status::text = 'completed'
    `);

    const [pendingDocuments] = await db.execute(sql`
      SELECT cast(count(*) as int) as count 
      FROM documents 
      WHERE status::text = 'pending'
    `);

    const [totalUsers] = await db.execute(sql`
      SELECT cast(count(*) as int) as count 
      FROM users
    `);

    const [totalContacts] = await db.execute(sql`
      SELECT cast(count(*) as int) as count 
      FROM contacts
    `);

    // Recent activity metrics (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [recentApplications] = await db.execute(sql`
      SELECT cast(count(*) as int) as count 
      FROM applications 
      WHERE created_at >= ${thirtyDaysAgo}
    `);

    const [recentDocuments] = await db.execute(sql`
      SELECT cast(count(*) as int) as count 
      FROM documents 
      WHERE created_at >= ${thirtyDaysAgo}
    `);

    const summary = {
      metrics: {
        totalApplications: totalApplications?.[0]?.count || 0,
        activeApplications: activeApplications?.[0]?.count || 0,
        completedApplications: completedApplications?.[0]?.count || 0,
        pendingDocuments: pendingDocuments?.[0]?.count || 0,
        totalUsers: totalUsers?.[0]?.count || 0,
        totalContacts: totalContacts?.[0]?.count || 0
      },
      recentActivity: {
        applicationsLast30Days: recentApplications?.[0]?.count || 0,
        documentsLast30Days: recentDocuments?.[0]?.count || 0
      },
      systemHealth: {
        status: 'operational',
        uptime: '99.9%',
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('📊 [ANALYTICS] Dashboard summary generated:', summary.metrics);

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('📊 [ANALYTICS] Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate dashboard summary',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

// GET /api/reports/pipeline-activity - Pipeline analytics
router.get('/pipeline-activity', developmentAuth, async (req: any, res: any) => {
  try {
    const { startDate, endDate, role, source } = req.query;
    console.log('📊 [ANALYTICS] Fetching pipeline activity');

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get applications in date range
    const allApps = await db
      .select({
        id: applications.id,
        status: applications.status,
        stage: applications.stage,
        createdAt: applications.createdAt,
        submittedAt: applications.submittedAt,
        requestedAmount: applications.requestedAmount,
        productCategory: applications.productCategory
      })
      .from(applications)
      .where(and(
        gte(applications.createdAt, start),
        lte(applications.createdAt, end)
      ));

    // Applications by status
    const byStatus = allApps.reduce((acc, app) => {
      const status = app.status || 'unknown';
      const existing = acc.find(item => item.name === status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ name: status, count: 1 });
      }
      return acc;
    }, [] as { name: string; count: number }[]);

    // Applications by stage
    const byStage = allApps.reduce((acc, app) => {
      const stage = app.stage || 'unknown';
      const existing = acc.find(item => item.name === stage);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ name: stage, count: 1 });
      }
      return acc;
    }, [] as { name: string; count: number }[]);

    // Applications trend by date
    const applicationsByDate = allApps.reduce((acc, app) => {
      const date = app.createdAt ? app.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [] as { date: string; count: number }[])
    .sort((a, b) => a.date.localeCompare(b.date));

    const pipelineData = {
      summary: {
        total: allApps.length,
        byStatus,
        byStage
      },
      trends: {
        applicationsByDate
      },
      dateRange: { start, end }
    };

    console.log('📊 [ANALYTICS] Pipeline activity generated:', allApps.length, 'applications');

    res.json({
      success: true,
      data: pipelineData
    });

  } catch (error: unknown) {
    console.error('📊 [ANALYTICS] Pipeline activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipeline activity',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

// GET /api/reports/document-status - Document analytics
router.get('/document-status', developmentAuth, async (req: any, res: any) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('📊 [ANALYTICS] Fetching document status analytics');

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get documents in date range
    const allDocs = await db
      .select({
        id: documents.id,
        status: documents.status,
        documentType: documents.documentType,
        isVerified: documents.isVerified,
        createdAt: documents.createdAt
      })
      .from(documents)
      .where(and(
        gte(documents.createdAt, start),
        lte(documents.createdAt, end)
      ));

    // Documents by status
    const byStatus = allDocs.reduce((acc, doc) => {
      const status = doc.status || 'unknown';
      const existing = acc.find(item => item.status === status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ status, count: 1 });
      }
      return acc;
    }, [] as { status: string; count: number }[]);

    // Documents by type
    const byType = allDocs.reduce((acc, doc) => {
      const type = doc.documentType || 'unknown';
      const existing = acc.find(item => item.type === type);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ type, count: 1 });
      }
      return acc;
    }, [] as { type: string; count: number }[]);

    // Processing metrics
    const verified = allDocs.filter(doc => doc.isVerified).length;
    const pending = allDocs.filter(doc => doc.status === 'pending').length;
    const failed = allDocs.filter(doc => doc.status === 'failed').length;

    const documentData = {
      summary: {
        total: allDocs.length,
        byStatus,
        byType,
        metrics: {
          verified,
          pending,
          failed,
          verificationRate: allDocs.length > 0 ? (verified / allDocs.length * 100).toFixed(1) : '0'
        }
      },
      dateRange: { start, end }
    };

    console.log('📊 [ANALYTICS] Document status generated:', allDocs.length, 'documents');

    res.json({
      success: true,
      data: documentData
    });

  } catch (error: unknown) {
    console.error('📊 [ANALYTICS] Document status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document status',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

// GET /api/reports/conversion - Conversion funnel analytics
router.get('/conversion', developmentAuth, async (req: any, res: any) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('📊 [ANALYTICS] Fetching conversion analytics');

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get applications in date range
    const allApps = await db
      .select({
        id: applications.id,
        status: applications.status,
        stage: applications.stage,
        createdAt: applications.createdAt,
        submittedAt: applications.submittedAt
      })
      .from(applications)
      .where(and(
        gte(applications.createdAt, start),
        lte(applications.createdAt, end)
      ));

    // Build conversion funnel
    const funnel = [
      {
        status: 'Started',
        count: allApps.length,
        percentage: 100
      },
      {
        status: 'Submitted',
        count: allApps.filter(app => app.submittedAt).length,
        percentage: allApps.length > 0 ? (allApps.filter(app => app.submittedAt).length / allApps.length * 100).toFixed(1) : '0'
      },
      {
        status: 'Under Review',
        count: allApps.filter(app => app.stage === 'In Review').length,
        percentage: allApps.length > 0 ? (allApps.filter(app => app.stage === 'In Review').length / allApps.length * 100).toFixed(1) : '0'
      },
      {
        status: 'Finalized',
        count: allApps.filter(app => app.stage === 'Finalized').length,
        percentage: allApps.length > 0 ? (allApps.filter(app => app.stage === 'Finalized').length / allApps.length * 100).toFixed(1) : '0'
      },
      {
        status: 'Funded',
        count: allApps.filter(app => app.status === 'funded').length,
        percentage: allApps.length > 0 ? (allApps.filter(app => app.status === 'funded').length / allApps.length * 100).toFixed(1) : '0'
      }
    ];

    const conversionData = {
      funnel,
      overallConversion: funnel[funnel.length - 1].percentage,
      dateRange: { start, end },
      totalApplications: allApps.length
    };

    console.log('📊 [ANALYTICS] Conversion analytics generated:', funnel[0].count, 'to', funnel[funnel.length - 1].count);

    res.json({
      success: true,
      data: conversionData
    });

  } catch (error: unknown) {
    console.error('📊 [ANALYTICS] Conversion analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion analytics',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

// GET /api/reports/communication-stats - Communication metrics
router.get('/communication-stats', developmentAuth, async (req: any, res: any) => {
  try {
    console.log('📊 [ANALYTICS] Fetching communication statistics');

    // Get communication metrics
    const [smsCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(smsMessages);

    const [callCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(callLogs);

    const [emailCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(emailMessages);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const [recentSMS] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(smsMessages)
      .where(gte(smsMessages.createdAt, sevenDaysAgo));

    const [recentCalls] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(callLogs)
      .where(gte(callLogs.createdAt, sevenDaysAgo));

    const [recentEmails] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(emailMessages)
      .where(gte(emailMessages.createdAt, sevenDaysAgo));

    const commStats = {
      totals: {
        sms: smsCount?.count || 0,
        calls: callCount?.count || 0,
        emails: emailCount?.count || 0
      },
      recent: {
        sms: recentSMS?.count || 0,
        calls: recentCalls?.count || 0,
        emails: recentEmails?.count || 0
      }
    };

    console.log('📊 [ANALYTICS] Communication stats generated:', commStats.totals);

    res.json({
      success: true,
      data: commStats
    });

  } catch (error: unknown) {
    console.error('📊 [ANALYTICS] Communication stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communication statistics',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

export default router;