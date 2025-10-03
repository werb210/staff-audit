import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, FileText, DollarSign, Clock, RefreshCw, Download } from 'lucide-react';

interface ReportFilters {
  startDate: string;
  endDate: string;
  role?: string;
  source?: string;
}

interface DashboardMetrics {
  totalApplications: number;
  activeApplications: number;
  completedApplications: number;
  pendingDocuments: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function ReportingDashboard() {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['/api/reports/dashboard-summary'],
    queryFn: async () => {
      const response = await fetch('/api/reports/dashboard-summary');
      if (!response.ok) throw new Error('Failed to fetch dashboard summary');
      return response.json();
    }
  });

  // Fetch pipeline activity
  const { data: pipelineData, isLoading: pipelineLoading, refetch: refetchPipeline } = useQuery({
    queryKey: ['/api/reports/pipeline-activity', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.role) params.append('role', filters.role);
      if (filters.source) params.append('source', filters.source);

      const response = await fetch(`/api/reports/pipeline-activity?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch pipeline data');
      return response.json();
    }
  });

  // Fetch document status
  const { data: documentData, isLoading: documentLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ['/api/reports/document-status', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/reports/document-status?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch document data');
      return response.json();
    }
  });

  // Fetch conversion data
  const { data: conversionData, isLoading: conversionLoading, refetch: refetchConversion } = useQuery({
    queryKey: ['/api/reports/conversion', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/reports/conversion?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch conversion data');
      return response.json();
    }
  });

  const handleRefreshAll = () => {
    refetchSummary();
    refetchPipeline();
    refetchDocuments();
    refetchConversion();
  };

  const handleExportData = async (reportType: string) => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await fetch(`/api/reports/${reportType}?${params.toString()}&export=true`);
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Reporting Dashboard</h1>
          <p className="text-gray-600">Analytics and insights for your lending operations</p>
        </div>
        
        <Button onClick={handleRefreshAll} disabled={summaryLoading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${summaryLoading ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="role">Filter by Role</Label>
              <Select value={filters.role || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value || undefined }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All roles</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Filter by Source</Label>
              <Select value={filters.source || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, source: value || undefined }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All sources</SelectItem>
                  <SelectItem value="application">Direct Application</SelectItem>
                  <SelectItem value="partner_referral">Partner Referral</SelectItem>
                  <SelectItem value="direct_call">Direct Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      {summary?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold">{summary.data.metrics.totalApplications}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Applications</p>
                  <p className="text-2xl font-bold">{summary.data.metrics.activeApplications}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{summary.data.metrics.completedApplications}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Documents</p>
                  <p className="text-2xl font-bold">{summary.data.metrics.pendingDocuments}</p>
                </div>
                <FileText className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Reports */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipeline">Pipeline Activity</TabsTrigger>
          <TabsTrigger value="documents">Document Status</TabsTrigger>
          <TabsTrigger value="conversion">Conversion Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Pipeline Activity</h3>
            <Button variant="outline" onClick={() => handleExportData('pipeline-activity')} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
          
          {pipelineData?.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Applications by Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Applications by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pipelineData.data.summary.byStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {pipelineData.data.summary.byStatus.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Applications Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Applications Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={pipelineData.data.trends.applicationsByDate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Document Status Analysis</h3>
            <Button variant="outline" onClick={() => handleExportData('document-status')} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
          
          {documentData?.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Documents by Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Documents by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={documentData.data.summary.byStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Documents by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Documents by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={documentData.data.summary.byType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Conversion Analysis</h3>
            <Button variant="outline" onClick={() => handleExportData('conversion')} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
          
          {conversionData?.data && (
            <div className="grid grid-cols-1 gap-6">
              {/* Conversion Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={conversionData.data.funnel}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}