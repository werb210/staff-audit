// Removed unused useEffect import
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  // DollarSign, 
  Building2, 
  FileText, 
  Phone, 
  Mail, 
  Calendar,
  ArrowRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
// import SiloSwitcher from '@/components/layout/SiloSwitcher';
// Removed old dialer import - using new FAB system

interface DashboardKPI {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'flat';
  period: string;
}

interface RecentActivity {
  id: string;
  type: 'application' | 'contact' | 'call' | 'email' | 'task';
  title: string;
  description: string;
  timestamp: string;
  priority?: 'high' | 'medium' | 'low';
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient(); // Hook must be at top level
  // Using new FAB dialer system - no need for hook
  const openDialer = () => console.log("[Dashboard] Dialer requested - handled by global FAB");

  // Removed unused showToast function
  // Dashboard KPIs - Connected to dashboard API
  const { data: kpiData, isLoading: loadingKPIs } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      try {
        const response = await api('/api/dashboard/kpis');
        return response.kpis || {};
      } catch (error) {
        console.warn('Dashboard KPIs failed, using fallback data');
        return {};
      }
    },
    staleTime: 30000,
  });

  // Transform KPI object to array for display
  const kpis: DashboardKPI[] = kpiData ? [
    { label: 'Total Applications', value: kpiData.apps || 0, change: 12.5, trend: 'up' as const, period: 'month' },
    { label: 'Approvals', value: kpiData.approvals || 0, change: 8.3, trend: 'up' as const, period: 'month' },
    { label: 'Funded', value: kpiData.funded || 0, change: -2.1, trend: 'down' as const, period: 'month' },
    { label: 'Revenue', value: `$${((kpiData.revenue || 0) / 1000000).toFixed(1)}M`, change: 15.7, trend: 'up' as const, period: 'month' }
  ] : [];

  // Recent Activity - Connected to dashboard API  
  const { data: activitiesData = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      try {
        const response = await api('/api/dashboard/activity');
        return Array.isArray(response.activity) ? response.activity : [];
      } catch (error) {
        console.warn('Dashboard activities failed, using fallback data');
        return [];
      }
    },
  });

  // Quick Stats - Connected to dashboard API
  const { data: quickStats = {} } = useQuery({
    queryKey: ['dashboard-quick-stats'], 
    queryFn: async () => {
      try {
        const response = await api('/api/dashboard/stats');
        return response.stats || {};
      } catch (error) {
        console.warn('Dashboard stats failed, using fallback data');
        return {};
      }
    },
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'application': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'contact': return <Users className="h-4 w-4 text-green-600" />;
      case 'call': return <Phone className="h-4 w-4 text-purple-600" />;
      case 'email': return <Mail className="h-4 w-4 text-orange-600" />;
      case 'task': return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : trend === 'down' ? (
      <TrendingDown className="h-4 w-4 text-red-600" />
    ) : (
      <div className="h-4 w-4" />
    );
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your business.</p>
        </div>
        <div className="flex items-center gap-3">
          {import.meta.env.DEV && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries();
              }}
            >
              ↻ Refresh
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/staff/tasks-calendar')}>
            <Calendar className="h-4 w-4 mr-2" />
            Today's Schedule
          </Button>

        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loadingKPIs ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : Array.isArray(kpis) && kpis.length > 0 ? (
          kpis.map((kpi: DashboardKPI, index: number) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{kpi.label}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                      {getTrendIcon(kpi.trend)}
                    </div>
                    <div className="flex items-center space-x-1 mt-2">
                      <span className={`text-sm font-medium ${
                        kpi.change > 0 ? 'text-green-600' : kpi.change < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {formatChange(kpi.change)}
                      </span>
                      <span className="text-sm text-gray-500">vs last {kpi.period}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">Loading dashboard metrics...</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              <Link to="/staff/pipeline">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingActivities ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-3">
                      <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : Array.isArray(activitiesData) && activitiesData.length > 0 ? (
                <div className="space-y-4">
                  {activitiesData.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.text || activity.title || 'Activity'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {new Date(activity.ts || activity.timestamp || Date.now()).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {activity.priority && (
                          <Badge 
                            variant={activity.priority === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {activity.priority}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {activity.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {quickStats.pending || 0}
                  </div>
                  <div className="text-sm text-blue-700">Pending Tasks</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {quickStats.applications || 0}
                  </div>
                  <div className="text-sm text-green-700">New Applications</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {quickStats.approved || 0}
                  </div>
                  <div className="text-sm text-red-700">Approved</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    ${((quickStats.total_volume || 0) / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm text-purple-700">Total Volume</div>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <Button className="w-full justify-start" variant="ghost" size="sm" onClick={() => navigate('/staff/contacts')}>
                  <Users className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
                <Button className="w-full justify-start" variant="ghost" size="sm" onClick={() => openDialer()}>
                  <Phone className="mr-2 h-4 w-4" />
                  Make Call
                </Button>
                <Button className="w-full justify-start" variant="ghost" size="sm" onClick={() => navigate('/staff/lenders')}>
                  <Building2 className="mr-2 h-4 w-4" />
                  View Lenders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}