import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { Badge } from "../../../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { 
  AlertTriangle, 
  Bug, 
  Zap, 
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  X
} from "lucide-react";
import { api } from '@/lib/queryClient';

interface IssueReport {
  id: string;
  title: string;
  description: string;
  category: 'bug' | 'feature_request' | 'performance' | 'security' | 'ui_ux' | 'data' | 'integration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'won_not_fix';
  reportedBy: string;
  assignedTo?: string;
  steps: string;
  expectedResult: string;
  actualResult: string;
  browserInfo?: string;
  attachments: string[];
  createdAt: string;
  lastUpdate: string;
  resolution?: string;
}

export default function ReportIssueTab() {
  
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    category: 'bug',
    severity: 'medium',
    steps: '',
    expectedResult: '',
    actualResult: '',
    reportedBy: 'Current User'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      const response = await api('/api/communications/issues');
      setIssues(response.issues || [
        {
          id: 'issue_1',
          title: 'Application form not saving properly',
          description: 'When customers fill out the equipment financing form, their data is not being saved if they navigate away and come back.',
          category: 'bug' as const,
          severity: 'high' as const,
          status: 'in_progress' as const,
          reportedBy: 'Sarah Thompson',
          assignedTo: 'Development Team',
          steps: '1. Go to equipment financing form\n2. Fill out customer details\n3. Navigate to different tab\n4. Come back to form\n5. Data is lost',
          expectedResult: 'Form data should be automatically saved and restored',
          actualResult: 'Form is blank when returning to the page',
          browserInfo: 'Chrome 127.0.6533.119',
          attachments: [],
          createdAt: '2025-08-21T09:30:00Z',
          lastUpdate: '2025-08-21T14:15:00Z'
        },
        {
          id: 'issue_2',
          title: 'SMS notifications not being sent',
          description: 'Customers are not receiving SMS notifications when their loan application status changes.',
          category: 'bug' as const,
          severity: 'critical' as const,
          status: 'open' as const,
          reportedBy: 'Mike Davis',
          steps: '1. Change application status to "Approved"\n2. SMS notification should be sent\n3. Customer does not receive SMS',
          expectedResult: 'Customer receives SMS notification about status change',
          actualResult: 'No SMS is sent',
          attachments: ['twilio-logs.txt'],
          createdAt: '2025-08-21T11:45:00Z',
          lastUpdate: '2025-08-21T11:45:00Z'
        },
        {
          id: 'issue_3',
          title: 'Dashboard loading performance is slow',
          description: 'The main staff dashboard takes 8-10 seconds to load, which is impacting productivity.',
          category: 'performance' as const,
          severity: 'medium' as const,
          status: 'resolved' as const,
          reportedBy: 'Kevin Park',
          assignedTo: 'Backend Team',
          steps: '1. Login to staff portal\n2. Navigate to main dashboard\n3. Wait for page to load',
          expectedResult: 'Dashboard should load within 2-3 seconds',
          actualResult: 'Dashboard takes 8-10 seconds to load',
          resolution: 'Optimized database queries and added caching. Load time now 1.2 seconds.',
          attachments: [],
          createdAt: '2025-08-20T16:20:00Z',
          lastUpdate: '2025-08-21T10:30:00Z'
        },
        {
          id: 'issue_4',
          title: 'Add bulk import for lender products',
          description: 'Need ability to import multiple lender products via CSV instead of adding them one by one.',
          category: 'feature_request' as const,
          severity: 'low' as const,
          status: 'open' as const,
          reportedBy: 'Lisa Chen',
          steps: 'N/A - Feature request',
          expectedResult: 'CSV import functionality for lender products',
          actualResult: 'Currently must add products manually',
          attachments: ['sample-lender-products.csv'],
          createdAt: '2025-08-19T13:15:00Z',
          lastUpdate: '2025-08-19T13:15:00Z'
        }
      ]);
    } catch (error) {
      console.error('Failed to load issues:', error);
      setIssues([]);
    }
  };

  const createIssue = async () => {
    setLoading(true);
    try {
      const issueData = {
        ...newIssue,
        browserInfo: navigator.userAgent,
        attachments: [],
        createdAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };

      const response = await api('/api/communications/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueData)
      });

      setIssues([response, ...issues]);
      setNewIssue({
        title: '',
        description: '',
        category: 'bug',
        severity: 'medium',
        steps: '',
        expectedResult: '',
        actualResult: '',
        reportedBy: 'Current User'
      });
      setShowNewIssue(false);
    } catch (error) {
      console.error('Failed to create issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return variants[severity] || variants.medium;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      won_not_fix: 'bg-purple-100 text-purple-800'
    };
    return variants[status] || variants.open;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, JSX.Element> = {
      bug: <Bug className="h-4 w-4" />,
      feature_request: <Zap className="h-4 w-4" />,
      performance: <Clock className="h-4 w-4" />,
      security: <AlertTriangle className="h-4 w-4" />,
      ui_ux: <AlertCircle className="h-4 w-4" />,
      data: <AlertTriangle className="h-4 w-4" />,
      integration: <Zap className="h-4 w-4" />
    };
    return icons[category] || <Bug className="h-4 w-4" />;
  };

  const categories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'performance', label: 'Performance Issue' },
    { value: 'security', label: 'Security Concern' },
    { value: 'ui_ux', label: 'UI/UX Issue' },
    { value: 'data', label: 'Data Issue' },
    { value: 'integration', label: 'Integration Problem' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Report an Issue
          </h2>
          <p className="text-gray-600">Track and resolve system issues and feature requests</p>
        </div>
        <Button onClick={() => setShowNewIssue(!showNewIssue)}>
          <Bug className="h-4 w-4 mr-2" />
          {showNewIssue ? 'Cancel' : 'Report New Issue'}
        </Button>
      </div>

      {/* Issue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {issues.filter(i => i.status === 'open').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {issues.filter(i => i.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">
                  {issues.filter(i => i.status === 'resolved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Issues</p>
                <p className="text-2xl font-bold text-purple-600">
                  {issues.filter(i => i.severity === 'critical').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Issue Form */}
      {showNewIssue && (
        <Card>
          <CardHeader>
            <CardTitle>Report New Issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Title
              </label>
              <Input
                value={newIssue.title}
                onChange={(e) => setNewIssue({...newIssue, title: e.target.value})}
                placeholder="Brief description of the issue"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select value={newIssue.category} onValueChange={(value) => setNewIssue({...newIssue, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value} className="text-gray-900 hover:bg-gray-100">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category.value)}
                          {category.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <Select value={newIssue.severity} onValueChange={(value) => setNewIssue({...newIssue, severity: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="low" className="text-gray-900 hover:bg-gray-100">Low</SelectItem>
                    <SelectItem value="medium" className="text-gray-900 hover:bg-gray-100">Medium</SelectItem>
                    <SelectItem value="high" className="text-gray-900 hover:bg-gray-100">High</SelectItem>
                    <SelectItem value="critical" className="text-gray-900 hover:bg-gray-100">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={newIssue.description}
                onChange={(e) => setNewIssue({...newIssue, description: e.target.value})}
                placeholder="Detailed description of the issue"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Steps to Reproduce
              </label>
              <Textarea
                value={newIssue.steps}
                onChange={(e) => setNewIssue({...newIssue, steps: e.target.value})}
                placeholder="1. Go to...\n2. Click on...\n3. Expected behavior vs actual behavior"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Result
                </label>
                <Textarea
                  value={newIssue.expectedResult}
                  onChange={(e) => setNewIssue({...newIssue, expectedResult: e.target.value})}
                  placeholder="What should happen?"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Result
                </label>
                <Textarea
                  value={newIssue.actualResult}
                  onChange={(e) => setNewIssue({...newIssue, actualResult: e.target.value})}
                  placeholder="What actually happens?"
                  rows={2}
                />
              </div>
            </div>

            <Button onClick={createIssue} disabled={loading} className="w-full">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Submit Issue Report'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>Issue Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {issues.map((issue) => (
              <div key={issue.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(issue.category)}
                      <h4 className="font-medium text-gray-900">{issue.title}</h4>
                      <Badge className={getSeverityBadge(issue.severity)}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 mb-2">
                      <div>
                        <strong>Steps:</strong> {issue.steps.split('\n')[0]}...
                      </div>
                      <div>
                        <strong>Expected:</strong> {issue.expectedResult.substring(0, 50)}...
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>👤 {issue.reportedBy}</span>
                      {issue.assignedTo && <span>👨‍💼 Assigned to {issue.assignedTo}</span>}
                      <span>📅 {new Date(issue.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge className={getStatusBadge(issue.status)}>
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                {issue.resolution && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                    <h5 className="text-sm font-medium text-green-800 mb-1">Resolution:</h5>
                    <p className="text-sm text-green-700">{issue.resolution}</p>
                  </div>
                )}

                {issue.attachments.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-gray-700 mb-1">Attachments:</h5>
                    <div className="flex gap-2">
                      {issue.attachments.map((attachment, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          📎 {attachment}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {issues.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No issues reported. The system is running smoothly! 🎉
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}