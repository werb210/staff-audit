/**
 * SECURITY DASHBOARD COMPONENT
 * Displays security test results and monitoring status
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface SecuritySummary {
  lastTestRun: string | null;
  lastTestGrade: string;
  overallTrend: string;
  criticalIssues: number;
  averageGrade: string;
  totalTestsRun: number;
  recentFailures: number;
}

interface SecurityTestResult {
  name: string;
  passed: boolean;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details?: string;
  error?: string;
}

interface SecurityTestLog {
  id: string;
  timestamp: string;
  environment: string;
  overallGrade: string;
  totalTests: number;
  passedTests: number;
  criticalFailures: number;
  results: SecurityTestResult[];
}

export function SecurityDashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/security/dashboard'],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes (reduced from 30 seconds)
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/security/history'],
    queryParams: { limit: '5' }
  });

  const runSecurityTest = async () => {
    // This would trigger a security test run
  };

  const getGradeBadgeVariant = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'default';
      case 'B': return 'secondary';
      case 'C': return 'outline';
      default: return 'destructive';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'Improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'Declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (summaryLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const summaryData: SecuritySummary = summary?.summary || {
    lastTestRun: null,
    lastTestGrade: 'Unknown',
    overallTrend: 'No data',
    criticalIssues: 0,
    averageGrade: 'N/A',
    totalTestsRun: 0,
    recentFailures: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <Button onClick={runSecurityTest} variant="outline">
          Run Security Test
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Current Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={getGradeBadgeVariant(summaryData.lastTestGrade)}>
                {summaryData.lastTestGrade}
              </Badge>
              {getTrendIcon(summaryData.overallTrend)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Trend: {summaryData.overallTrend}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {summaryData.criticalIssues}
              </span>
              {summaryData.criticalIssues === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summaryData.recentFailures} recent failures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tests Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryData.totalTestsRun}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total test executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Last Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {summaryData.lastTestRun ? (
                new Date(summaryData.lastTestRun).toLocaleString()
              ) : (
                'No tests run'
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Most recent execution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Test History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Tests</CardTitle>
          <CardDescription>
            Latest security test executions and results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {history?.history?.map((test: SecurityTestLog) => (
                <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={getGradeBadgeVariant(test.overallGrade)}>
                      {test.overallGrade}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {test.passedTests}/{test.totalTests} tests passed
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(test.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.criticalFailures > 0 && (
                      <Badge variant="destructive">
                        {test.criticalFailures} critical
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500 uppercase">
                      {test.environment}
                    </span>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No security tests have been run yet
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Categories Status */}
      <Card>
        <CardHeader>
          <CardTitle>Security Test Categories</CardTitle>
          <CardDescription>
            Coverage across different security test types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'OTP Bypass Prevention', status: 'protected', severity: 'CRITICAL' },
              { name: 'Token Scope Validation', status: 'protected', severity: 'CRITICAL' },
              { name: 'CORS Configuration', status: 'configured', severity: 'CRITICAL' },
              { name: 'Rate Limit Protection', status: 'active', severity: 'HIGH' },
              { name: 'Input Injection Defense', status: 'monitoring', severity: 'HIGH' },
              { name: 'Security Headers', status: 'implemented', severity: 'MEDIUM' },
              { name: 'CSP Violation Detection', status: 'active', severity: 'MEDIUM' },
              { name: 'File Upload Security', status: 'secured', severity: 'MEDIUM' },
              { name: 'Error Handling', status: 'hardened', severity: 'HIGH' }
            ].map((category) => (
              <div key={category.name} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium text-sm">{category.name}</div>
                  <div className="text-xs text-gray-500">{category.severity}</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {category.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}