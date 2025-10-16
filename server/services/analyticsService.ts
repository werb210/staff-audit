import { google } from 'googleapis';

interface AnalyticsSummary {
  sessions: number;
  pageviews: number;
  users: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  topSources: Array<{
    source: string;
    sessions: number;
    users: number;
  }>;
  dailyStats: Array<{
    date: string;
    sessions: number;
    users: number;
    pageviews: number;
  }>;
}

export class AnalyticsService {
  private analytics: any;
  private propertyId: string;

  constructor() {
    // Initialize Google Analytics Data API
    this.propertyId = process.env.GA4_PROPERTY_ID || '';
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_ANALYTICS_KEY) {
      try {
        // Use service account authentication
        const auth = new google.auth.GoogleAuth({
          keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        });

        this.analytics = google.analyticsdata({
          version: 'v1beta',
          auth
        });
        
        console.log('[GA4] Analytics service initialized with service account');
      } catch (error) {
        console.warn('[GA4] Failed to initialize analytics service:', error);
        this.analytics = null;
      }
    } else {
      console.warn('[GA4] No Google Analytics credentials provided');
      this.analytics = null;
    }
  }

  // Get analytics summary for dashboard
  async getAnalyticsSummary(days: number = 30): Promise<AnalyticsSummary> {
    if (!this.analytics || !this.propertyId) {
      return this.getMockAnalyticsSummary();
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      // Run multiple reports in parallel
      const [overviewReport, trafficSourcesReport, dailyReport] = await Promise.all([
        this.getOverviewReport(startDate, endDate),
        this.getTrafficSourcesReport(startDate, endDate),
        this.getDailyReport(startDate, endDate)
      ]);

      return {
        sessions: this.extractMetric(overviewReport, 'sessions', 0),
        pageviews: this.extractMetric(overviewReport, 'screenPageViews', 0),
        users: this.extractMetric(overviewReport, 'activeUsers', 0),
        bounceRate: this.extractMetric(overviewReport, 'bounceRate', 0),
        avgSessionDuration: this.extractMetric(overviewReport, 'averageSessionDuration', 0),
        conversions: this.extractMetric(overviewReport, 'conversions', 0),
        topSources: this.parseTrafficSources(trafficSourcesReport),
        dailyStats: this.parseDailyStats(dailyReport)
      };

    } catch (error) {
      console.error('[GA4] Error fetching analytics data:', error);
      return this.getMockAnalyticsSummary();
    }
  }

  // Get overview metrics report
  private async getOverviewReport(startDate: Date, endDate: Date): Promise<any> {
    return await this.analytics.properties.runReport({
      property: `properties/${this.propertyId}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'conversions' }
        ]
      }
    });
  }

  // Get traffic sources report
  private async getTrafficSourcesReport(startDate: Date, endDate: Date): Promise<any> {
    return await this.analytics.properties.runReport({
      property: `properties/${this.propertyId}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }],
        dimensions: [
          { name: 'sessionSource' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' }
        ],
        orderBys: [{
          metric: { metricName: 'sessions' },
          desc: true
        }],
        limit: 10
      }
    });
  }

  // Get daily stats report
  private async getDailyReport(startDate: Date, endDate: Date): Promise<any> {
    return await this.analytics.properties.runReport({
      property: `properties/${this.propertyId}`,
      requestBody: {
        dateRanges: [{
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }],
        dimensions: [
          { name: 'date' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' }
        ],
        orderBys: [{
          dimension: { dimensionName: 'date' }
        }]
      }
    });
  }

  // Extract metric value from report
  private extractMetric(report: any, metricName: string, defaultValue: number): number {
    try {
      const rows = report.data?.rows;
      if (!rows || rows.length === 0) return defaultValue;
      
      const metricIndex = report.data.metricHeaders.findIndex(
        (header: any) => header.name === metricName
      );
      
      if (metricIndex === -1) return defaultValue;
      
      const value = parseFloat(rows[0].metricValues[metricIndex].value);
      return isNaN(value) ? defaultValue : value;
    } catch (error) {
      console.error(`[GA4] Error extracting metric ${metricName}:`, error);
      return defaultValue;
    }
  }

  // Parse traffic sources data
  private parseTrafficSources(report: any): Array<{ source: string; sessions: number; users: number }> {
    try {
      const rows = report.data?.rows || [];
      
      return rows.map((row: any) => ({
        source: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value) || 0,
        users: parseInt(row.metricValues[1].value) || 0
      }));
    } catch (error) {
      console.error('[GA4] Error parsing traffic sources:', error);
      return [];
    }
  }

  // Parse daily stats data
  private parseDailyStats(report: any): Array<{ date: string; sessions: number; users: number; pageviews: number }> {
    try {
      const rows = report.data?.rows || [];
      
      return rows.map((row: any) => ({
        date: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value) || 0,
        users: parseInt(row.metricValues[1].value) || 0,
        pageviews: parseInt(row.metricValues[2].value) || 0
      }));
    } catch (error) {
      console.error('[GA4] Error parsing daily stats:', error);
      return [];
    }
  }

  // Mock analytics data for development/fallback
  private getMockAnalyticsSummary(): AnalyticsSummary {
    const days = 30;
    const dailyStats = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      dailyStats.push({
        date: date.toISOString().split('T')[0],
        sessions: Math.floor(Math.random() * 200) + 50,
        users: Math.floor(Math.random() * 150) + 30,
        pageviews: Math.floor(Math.random() * 400) + 100
      });
    }

    return {
      sessions: dailyStats.reduce((sum, day) => sum + day.sessions, 0),
      pageviews: dailyStats.reduce((sum, day) => sum + day.pageviews, 0),
      users: dailyStats.reduce((sum, day) => sum + day.users, 0),
      bounceRate: 0.42,
      avgSessionDuration: 142,
      conversions: Math.floor(Math.random() * 50) + 20,
      topSources: [
        { source: 'google', sessions: 1250, users: 980 },
        { source: 'direct', sessions: 850, users: 720 },
        { source: 'linkedin', sessions: 420, users: 380 },
        { source: 'facebook', sessions: 310, users: 280 },
        { source: 'referral', sessions: 180, users: 160 }
      ],
      dailyStats
    };
  }

  // Get real-time analytics (last 30 minutes)
  async getRealTimeStats(): Promise<{ activeUsers: number; topPages: any[] }> {
    if (!this.analytics || !this.propertyId) {
      return {
        activeUsers: Math.floor(Math.random() * 25) + 5,
        topPages: [
          { page: '/', activeUsers: 8 },
          { page: '/dashboard', activeUsers: 5 },
          { page: '/applications', activeUsers: 3 }
        ]
      };
    }

    try {
      const report = await this.analytics.properties.runRealtimeReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dimensions: [
            { name: 'unifiedPagePathScreen' }
          ],
          metrics: [
            { name: 'activeUsers' }
          ],
          orderBys: [{
            metric: { metricName: 'activeUsers' },
            desc: true
          }],
          limit: 10
        }
      });

      const rows = report.data?.rows || [];
      const totalActiveUsers = report.data?.totals?.[0]?.metricValues?.[0]?.value || 0;
      
      const topPages = rows.map((row: any) => ({
        page: row.dimensionValues[0].value,
        activeUsers: parseInt(row.metricValues[0].value) || 0
      }));

      return {
        activeUsers: parseInt(totalActiveUsers),
        topPages
      };

    } catch (error) {
      console.error('[GA4] Error fetching real-time stats:', error);
      return this.getRealTimeStats(); // Return mock data
    }
  }

  // Check if analytics is properly configured
  isConfigured(): boolean {
    return !!(this.analytics && this.propertyId);
  }

  // Get configuration status
  getConfigStatus(): { configured: boolean; propertyId?: string; credentialsProvided: boolean } {
    return {
      configured: this.isConfigured(),
      propertyId: this.propertyId || undefined,
      credentialsProvided: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_ANALYTICS_KEY)
    };
  }
}

export const analyticsService = new AnalyticsService();