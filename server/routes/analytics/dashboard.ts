import { Router } from "express";
import { getSummary, getRealTimeStats } from "../../services/analytics";
// REMOVED: requirePermission from authz service (authentication system deleted)

const router = Router();

// ✅ Ensure this route exists instead of redirecting
router.get("/ws-dashboard", (req: any, res: any) => {
  res.status(200).send("WS Dashboard OK");
});

/* Dashboard KPIs */
router.get("/kpis", async (req: any, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const fromISO = startDate.toISOString().split('T')[0];
    const toISO = endDate.toISOString().split('T')[0];

    const summary = await getSummary(fromISO, toISO);
    const realTimeStats = await getRealTimeStats();

    // Calculate conversion rates
    const conversionRate = summary.totals.apps_created > 0 
      ? (summary.totals.apps_funded / summary.totals.apps_created * 100).toFixed(1)
      : '0.0';

    const avgDailyApps = summary.totals.apps_created / Math.max(summary.rows.length, 1);

    res.json({
      period,
      dateRange: { from: fromISO, to: toISO },
      totals: summary.totals,
      realTime: realTimeStats,
      metrics: {
        conversionRate: parseFloat(conversionRate),
        avgDailyApplications: Math.round(avgDailyApps * 10) / 10,
        totalVolume: summary.totals.funded_amount,
        messageVolume: summary.totals.messages_in + summary.totals.messages_out
      },
      trends: summary.rows
    });
  } catch (error: unknown) {
    console.error('Dashboard KPIs error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/* Time Series Data for Charts */
router.get("/timeseries", async (req: any, res) => {
  try {
    const { metric = 'apps_created', period = '30d' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period.replace('d', '')));

    const fromISO = startDate.toISOString().split('T')[0];
    const toISO = endDate.toISOString().split('T')[0];

    const summary = await getSummary(fromISO, toISO);

    // Transform data for charts
    const chartData = summary.rows.map((row: any) => ({
      date: row.day,
      value: Number(row[metric] || 0),
      label: new Date(row.day).toLocaleDateString()
    }));

    res.json({
      metric,
      period,
      data: chartData,
      total: summary.totals[metric] || 0
    });
  } catch (error: unknown) {
    console.error('Time series error:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

/* Performance Metrics */
router.get("/performance", async (req: any, res) => {
  try {
    const realTimeStats = await getRealTimeStats();
    
    // Calculate performance indicators
    const totalPending = Number(realTimeStats.pending_apps || 0);
    const totalProcessed = Number(realTimeStats.approved_apps || 0) + Number(realTimeStats.funded_apps || 0);
    const processingRate = totalPending + totalProcessed > 0 
      ? (totalProcessed / (totalPending + totalProcessed) * 100).toFixed(1)
      : '0.0';

    const documentsToday = Number(realTimeStats.docs_today || 0);
    const messagesToday = Number(realTimeStats.messages_today || 0);
    const pendingRequests = Number(realTimeStats.pending_requests || 0);

    res.json({
      processing: {
        rate: parseFloat(processingRate),
        pending: totalPending,
        processed: totalProcessed,
        total: totalPending + totalProcessed
      },
      activity: {
        documentsToday,
        messagesToday,
        pendingRequests
      },
      capacity: {
        lenders: Number(realTimeStats.total_lenders || 0),
        utilization: Math.min(100, (totalPending / 100) * 100) // Assuming max capacity of 100
      }
    });
  } catch (error: unknown) {
    console.error('Performance metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

export default router;