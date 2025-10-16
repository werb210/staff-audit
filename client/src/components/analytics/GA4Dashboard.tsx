import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  Loader2, 
  Users, 
  Eye, 
  MousePointer, 
  TrendingUp, 
  Clock,
  RefreshCw,
  Settings,
  Activity
} from 'lucide-react';

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

interface RealTimeStats {
  activeUsers: number;
  topPages: Array<{
    page: string;
    activeUsers: number;
  }>;
}

export default function GA4Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // Fetch analytics summary
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['analytics-summary', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/ga4/summary?days=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics summary');
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  // Fetch real-time analytics
  const { data: realTimeData, isLoading: realTimeLoading } = useQuery({
    queryKey: ['analytics-realtime'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/ga4/realtime');
      if (!response.ok) {
        throw new Error('Failed to fetch real-time analytics');
      }
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const summary: AnalyticsSummary = summaryData?.data;
  const realTime: RealTimeStats = realTimeData?.data;
  const isConfigured = summaryData?.configured ?? false;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatBounceRate = (rate: number): string => {
    return (rate * 100).toFixed(1) + '%';
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3 text-lg">Loading analytics...</span>
      </div>
    );
  }

  if (summaryError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analytics Configuration Required</h3>
          <p className="text-muted-foreground mb-4">
            Google Analytics 4 integration needs to be configured to display data.
          </p>
          <Badge variant="outline">Contact admin to configure GA4</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Google Analytics 4 insights for the last {selectedPeriod} days
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Period Selector */}
          <div className="flex items-center space-x-1">
            {[7, 30, 90].map(days => (
              <Button
                key={days}
                variant={selectedPeriod === days ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(days)}
              >
                {days}d
              </Button>
            ))}
          </div>
          
          {/* Configuration Status */}
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? "Live Data" : "Demo Data"}
          </Badge>
        </div>
      </div>

      {/* Real-time Stats */}
      {realTime && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <span>Right Now</span>
              {realTimeLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-3xl font-bold text-green-500">{realTime.activeUsers}</p>
                <p className="text-sm text-muted-foreground">Active users right now</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Top Active Pages</p>
                <div className="space-y-1">
                  {realTime.topPages.slice(0, 3).map((page, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="truncate">{page.page}</span>
                      <span className="text-muted-foreground">{page.activeUsers}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sessions</p>
                <p className="text-2xl font-bold">{formatNumber(summary?.sessions || 0)}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Page Views</p>
                <p className="text-2xl font-bold">{formatNumber(summary?.pageviews || 0)}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bounce Rate</p>
                <p className="text-2xl font-bold">{formatBounceRate(summary?.bounceRate || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Duration</p>
                <p className="text-2xl font-bold">{formatDuration(summary?.avgSessionDuration || 0)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={summary?.dailyStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Top Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary?.topSources || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sessions" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Sources Table */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Sources Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Source</th>
                  <th className="text-right py-2">Sessions</th>
                  <th className="text-right py-2">Users</th>
                  <th className="text-right py-2">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {summary?.topSources?.map((source, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <div className="flex items-center space-x-2">
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium capitalize">{source.source}</span>
                      </div>
                    </td>
                    <td className="text-right py-2">{formatNumber(source.sessions)}</td>
                    <td className="text-right py-2">{formatNumber(source.users)}</td>
                    <td className="text-right py-2">
                      {summary?.sessions ? ((source.sessions / summary.sessions) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                )) || []}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}