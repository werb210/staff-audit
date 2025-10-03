import { useQuery } from '@tanstack/react-query';
// Removed unused useState import
import { api } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, FileText, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lower } from '@/lib/dedupe';

type ReportMetric = {
  title: string;
  value: string;
  change: string;
  icon: any;
  color: string;
};

export default function ReportsListPage() {
  const { toast } = useToast();
  const { isLoading } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: async () => {
      const response = await api('/api/overview');
      return response || {};
    },
  });

  const reportCategories = [
    {
      title: 'Sales Reports',
      description: 'Pipeline performance, conversion rates, and sales metrics',
      icon: TrendingUp,
      reports: ['Sales Pipeline', 'Conversion Funnel', 'Revenue Analysis', 'Monthly Performance']
    },
    {
      title: 'Lender Reports',
      description: 'Lender performance, approval rates, and product analytics',
      icon: DollarSign,
      reports: ['Lender Performance', 'Approval Rates', 'Product Analytics', 'Risk Assessment']
    },
    {
      title: 'Marketing Reports',
      description: 'Campaign performance, lead generation, and ROI analysis',
      icon: BarChart3,
      reports: ['Campaign ROI', 'Lead Sources', 'Conversion Tracking', 'Budget Analysis', 'Analytics Dashboard']
    },
    {
      title: 'Customer Reports',
      description: 'Customer analytics, satisfaction scores, and retention metrics',
      icon: Users,
      reports: ['Customer Satisfaction', 'Retention Analysis', 'Lifecycle Reports', 'Support Metrics']
    },
    {
      title: 'Document Reports',
      description: 'Document processing, compliance tracking, and audit trails',
      icon: FileText,
      reports: ['Processing Times', 'Compliance Status', 'Audit Logs', 'Document Types']
    },
    {
      title: 'Operational Reports',
      description: 'System performance, user activity, and operational metrics',
      icon: Calendar,
      reports: ['System Health', 'User Activity', 'Performance Metrics', 'Error Logs']
    }
  ];

  const quickMetrics: ReportMetric[] = [
    {
      title: 'Total Applications',
      value: '247',
      change: '+12%',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Active Lenders',
      value: '13',
      change: '+5%',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Conversion Rate',
      value: '63.2%',
      change: '+8%',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'Pipeline Value',
      value: '$18.75M',
      change: '+15%',
      icon: BarChart3,
      color: 'text-orange-600'
    }
  ];

  if (isLoading) return <div className="p-6">Loading reports...</div>;

  return (
    <div className="p-6" data-page="reports-list">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
        <Button className="flex items-center gap-2" onClick={() => {
          // Navigate to custom report builder
          window.location.href = '/staff/reports/custom';
          toast({title: "Opening Report Builder", description: "Loading custom report generator..."});
        }}>
          <BarChart3 className="w-4 h-4" />
          Generate Report
        </Button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {quickMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-sm text-green-600">{metric.change} from last month</p>
                </div>
                <metric.icon className={`w-8 h-8 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCategories.map((category, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <category.icon className="w-6 h-6 text-blue-600" />
                <div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {category.reports.map((report, reportIndex) => (
                  <div key={reportIndex} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <span className="text-sm">{report}</span>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const reportSlug = lower(report).replace(/\\s+/g, '-');
                      if (reportSlug === 'analytics-dashboard' || reportSlug === 'google-analytics') {
                        window.location.href = `/staff/reports/analytics`;
                      } else {
                        window.location.href = `/staff/reports/${reportSlug}`;
                      }
                      toast({title: "Opening Report", description: `Loading ${report}...`});
                    }}>View</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}