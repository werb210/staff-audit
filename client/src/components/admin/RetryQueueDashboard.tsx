import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface RetryLog {
  id: string;
  applicationId: string;
  fileName: string;
  documentType: string;
  attempt: number;
  errorMessage: string;
  retryScheduledAt?: string;
  retryCompletedAt?: string;
  retrySuccess?: boolean;
  finalErrorMessage?: string;
  createdAt: string;
}

interface QueueStatus {
  totalJobs: number;
  isProcessing: boolean;
  jobs: Array<{
    id: string;
    applicationId: string;
    jobType: string;
    attempt: number;
    maxAttempts: number;
    scheduledAt?: string;
    lastError?: string;
  }>;
}

export default function RetryQueueDashboard() {
  const [selectedLog, setSelectedLog] = useState<RetryLog | null>(null);
  const queryClient = useQueryClient();

  // Fetch retry logs
  const { data: logsData, isLoading: logsLoading, error: logsError } = useQuery({
    queryKey: ['retry-logs'],
    queryFn: async () => {
      const response = await fetch('/api/admin/retry-queue/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch retry logs');
      }
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch queue status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['retry-queue-status'],
    queryFn: async () => {
      const response = await fetch('/api/admin/retry-queue/status');
      if (!response.ok) {
        throw new Error('Failed to fetch queue status');
      }
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Manual retry mutation
  const retryMutation = useMutation({
    mutationFn: async ({ applicationId, jobType }: { applicationId: string; jobType: string }) => {
      const response = await fetch('/api/admin/retry-queue/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationId, jobType }),
      });
      if (!response.ok) {
        throw new Error('Failed to retry job');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retry-logs'] });
      queryClient.invalidateQueries({ queryKey: ['retry-queue-status'] });
    }
  });

  const logs: RetryLog[] = logsData?.logs || [];
  const queueStatus: QueueStatus = statusData?.status || { totalJobs: 0, isProcessing: false, jobs: [] };

  const getStatusIcon = (log: RetryLog) => {
    if (log.retrySuccess === true) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (log.retrySuccess === false) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (log: RetryLog) => {
    if (log.retrySuccess === true) {
      return <Badge className="bg-green-100 text-green-800">Success</Badge>;
    } else if (log.retrySuccess === false) {
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const handleRetryJob = (applicationId: string, jobType: string) => {
    retryMutation.mutate({ applicationId, jobType });
  };

  if (logsLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3 text-lg">Loading retry queue...</span>
      </div>
    );
  }

  if (logsError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Retry Queue</h3>
          <p className="text-muted-foreground">Please check your permissions and try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{queueStatus.totalJobs}</p>
              </div>
              <RefreshCw className={`h-8 w-8 text-blue-500 ${queueStatus.isProcessing ? 'animate-spin' : ''}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Queue Status</p>
                <p className="text-2xl font-bold">
                  {queueStatus.isProcessing ? 'Processing' : 'Idle'}
                </p>
              </div>
              <div className={`h-3 w-3 rounded-full ${queueStatus.isProcessing ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs */}
      {queueStatus.jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Queue Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {queueStatus.jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{job.jobType}</Badge>
                      <span className="font-medium">App {job.applicationId.slice(0, 8)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Attempt {job.attempt}/{job.maxAttempts}
                      {job.scheduledAt && ` • Next: ${new Date(job.scheduledAt).toLocaleTimeString()}`}
                    </p>
                    {job.lastError && (
                      <p className="text-sm text-red-600 mt-1">{job.lastError}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetryJob(job.applicationId, job.jobType)}
                    disabled={retryMutation.isPending}
                  >
                    {retryMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry Now
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retry Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Retry History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(log)}
                    <Badge variant="outline">{log.documentType}</Badge>
                    <span className="font-medium">App {log.applicationId.slice(0, 8)}</span>
                    {getStatusBadge(log)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    File: {log.fileName} • Attempt {log.attempt}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                  {log.errorMessage && (
                    <p className="text-sm text-red-600 mt-1 truncate">{log.errorMessage}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetryJob(log.applicationId, log.documentType)}
                    disabled={retryMutation.isPending || log.retrySuccess === true}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedLog(log)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
            
            {logs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No retry logs found. The queue is empty.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Retry Log Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Application ID</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.applicationId}</p>
                </div>
                <div>
                  <p className="font-medium">File Name</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.fileName}</p>
                </div>
                <div>
                  <p className="font-medium">Document Type</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.documentType}</p>
                </div>
                <div>
                  <p className="font-medium">Attempt</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.attempt}</p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  {getStatusBadge(selectedLog)}
                </div>
                <div>
                  <p className="font-medium">Created At</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {selectedLog.errorMessage && (
                <div>
                  <p className="font-medium">Error Message</p>
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{selectedLog.errorMessage}</p>
                </div>
              )}
              
              {selectedLog.finalErrorMessage && (
                <div>
                  <p className="font-medium">Final Error</p>
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{selectedLog.finalErrorMessage}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleRetryJob(selectedLog.applicationId, selectedLog.documentType);
                    setSelectedLog(null);
                  }}
                  disabled={retryMutation.isPending || selectedLog.retrySuccess === true}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry Job
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}