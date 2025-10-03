import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  User, 
  Mail, 
  Calendar,
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';

interface ChatSession {
  id: string;
  session_id: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  contact_id?: string;
  application_id?: string;
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_staff_id?: string;
  started_at: string;
  last_activity: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'staff' | 'assistant';
  message: string;
  user_id?: string;
  staff_user_id?: string;
  sent_at: string;
  created_at: string;
}

interface ChatEscalation {
  id: string;
  session_id: string;
  user_name: string;
  user_email: string;
  message: string;
  escalation_reason: string;
  application_id?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
  assigned_staff_id?: string;
  resolution?: string;
}

interface IssueReport {
  id: string;
  session_id: string;
  user_name: string;
  user_email: string;
  issue_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  application_id?: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
  resolved_by?: string;
}

export function ChatEscalationDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat sessions (escalations)
  const { 
    data: chatSessionsData, 
    isLoading: chatSessionsLoading, 
    error: chatSessionsError 
  } = useQuery({
    queryKey: ['/api/chat-sessions', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', '50');
      
      const response = await fetch(`/api/chat-sessions?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch chat sessions');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });

  // Fetch issue reports
  const { 
    data: issuesData, 
    isLoading: issuesLoading, 
    error: issuesError 
  } = useQuery({
    queryKey: ['/api/chat/issue-reports', statusFilter, severityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      params.append('limit', '50');
      
      const response = await fetch(`/api/chat/issue-reports?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch issue reports');
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Update chat session status
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, status, assigned_staff_id }: { id: string; status: string; assigned_staff_id?: string }) => {
      const response = await fetch(`/api/chat-sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, assigned_staff_id })
      });
      if (!response.ok) throw new Error('Failed to update chat session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat-sessions'] });
      toast({ title: 'Chat session updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update chat session', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Update issue report status
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/chat/issue-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update issue report');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/issue-reports'] });
      toast({ title: 'Issue report updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update issue report', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const chatSessions: ChatSession[] = chatSessionsData?.data || [];
  const issues = issuesData?.reports || [];

  // Filter chat sessions by search term
  const filteredChatSessions = chatSessions.filter((session: ChatSession) => 
    !searchTerm || 
    session.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.sessionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter issues by search term
  const filteredIssues = issues.filter((issue: IssueReport) => 
    !searchTerm || 
    issue.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.session_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: 'destructive',
      open: 'destructive',
      waiting: 'destructive',
      in_progress: 'default',
      active: 'default',
      resolved: 'secondary',
      completed: 'secondary',
      closed: 'secondary',
      abandoned: 'outline'
    };
    const variant = variants[status] || 'outline';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[severity as keyof typeof colors] || colors.medium}`}>
        {severity}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat Support Dashboard</h1>
          <p className="text-gray-600">Manage customer escalations and issue reports</p>
        </div>
        <Button 
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/chat/escalations'] });
            queryClient.invalidateQueries({ queryKey: ['/api/chat/issue-reports'] });
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-500 flex items-center">
              Found: {filteredChatSessions.length + filteredIssues.length} items
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="escalations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="escalations" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Active Chats ({filteredChatSessions.length})
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Issue Reports ({filteredIssues.length})
          </TabsTrigger>
        </TabsList>

        {/* Escalations Tab */}
        <TabsContent value="escalations">
          {chatSessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading chat sessions...</span>
            </div>
          ) : chatSessionsError ? (
            <Card>
              <CardContent className="p-6 text-center text-red-600">
                Failed to load chat sessions: {(chatSessionsError as Error)?.message}
              </CardContent>
            </Card>
          ) : filteredChatSessions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No active chat sessions found</p>
                <p className="text-sm mt-2">Customer chat escalations will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredChatSessions.map((session: ChatSession) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{session.userName || 'Anonymous'}</h4>
                          <p className="text-sm text-gray-500">{session.userEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(session.status)}
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.startedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Reason:</strong> {escalation.escalation_reason.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Session:</strong> {escalation.session_id}
                      </p>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        "{escalation.message}"
                      </div>
                    </div>

                    {escalation.status !== 'resolved' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateEscalationMutation.mutate({
                            id: escalation.id,
                            status: 'in_progress'
                          })}
                          disabled={updateEscalationMutation.isPending}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Mark In Progress
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateEscalationMutation.mutate({
                            id: escalation.id,
                            status: 'resolved',
                            resolution: 'Resolved by staff'
                          })}
                          disabled={updateEscalationMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Resolved
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Issue Reports Tab */}
        <TabsContent value="issues">
          {issuesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading issue reports...</span>
            </div>
          ) : issuesError ? (
            <Card>
              <CardContent className="p-6 text-center text-red-600">
                Failed to load issue reports: {issuesError.message}
              </CardContent>
            </Card>
          ) : filteredIssues.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No issue reports found</p>
                <p className="text-sm mt-2">Technical issues will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredIssues.map((issue: IssueReport) => (
                <Card key={issue.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{issue.user_name}</h4>
                          <p className="text-sm text-gray-500">{issue.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(issue.severity)}
                        {getStatusBadge(issue.status)}
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(issue.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Type:</strong> {issue.issue_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Session:</strong> {issue.session_id}
                      </p>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        "{issue.description}"
                      </div>
                    </div>

                    {issue.status !== 'closed' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateIssueMutation.mutate({
                            id: issue.id,
                            status: 'in_progress'
                          })}
                          disabled={updateIssueMutation.isPending}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Mark In Progress
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateIssueMutation.mutate({
                            id: issue.id,
                            status: 'closed'
                          })}
                          disabled={updateIssueMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Closed
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ChatEscalationDashboard;