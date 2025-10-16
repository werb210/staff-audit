import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Clock, Users, TrendingUp, Search, Eye, Calendar, Phone, Mail } from 'lucide-react';

interface ApplicantSession {
  sessionId: string;
  businessName: string;
  userEmail: string | null;
  userPhone: string | null;
  startTime: string;
  endTime: string | null;
  totalMessages: number;
  status: 'active' | 'completed' | 'abandoned';
  updatedAt: string;
}

interface SessionMessage {
  id: number;
  sessionId: string;
  role: 'user' | 'bot';
  message: string;
  page: string | null;
  timestamp: string;
  messageIndex: number;
  metadata: string | null;
}

interface SessionDetail {
  session: ApplicantSession;
  messages: SessionMessage[];
  messageCount: number;
}

interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  recent_24h: number;
  total_messages: number;
  avg_messages_per_session: number;
}

export function AIReportsDashboard() {
  const [selectedSession, setSelectedSession] = useState<ApplicantSession | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Fetch session statistics
  const { data: statsData } = useQuery({
    queryKey: ['ai-reports-stats'],
    queryFn: async () => {
      const response = await fetch('/api/ai-reports/stats/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI reports statistics');
      }

      return response.json() as SessionStats;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch sessions list
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['ai-reports-sessions', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('businessName', searchQuery.trim());
      
      const response = await fetch(`/api/ai-reports/sessions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI reports sessions');
      }

      return response.json();
    },
    refetchInterval: 15000 // Refresh every 15 seconds for real-time updates
  });

  // Fetch session detail when one is selected
  const { data: sessionDetailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['ai-reports-session-detail', selectedSession?.sessionId],
    queryFn: async () => {
      if (!selectedSession) return null;
      
      const response = await fetch(`/api/ai-reports/sessions/${selectedSession.sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session details');
      }

      return response.json() as SessionDetail;
    },
    enabled: !!selectedSession
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'abandoned': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const sessions = sessionsData?.sessions || [];
  const stats = statsData || {};

  if (selectedSession && sessionDetailData) {
    const { session, messages } = sessionDetailData;
    
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setSelectedSession(null)}
              size="sm"
            >
              ← Back to Sessions
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{session.businessName}</h1>
              <p className="text-gray-600">Conversation Details</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(session.status)}>
              {session.status}
            </Badge>
            <span className="text-sm text-gray-500">
              {messages.length} messages
            </span>
          </div>
        </div>

        {/* Session Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Session Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Started:</span><br />
                {formatDate(session.startTime)}
              </div>
              <div>
                <span className="font-medium">Duration:</span><br />
                {formatDuration(session.startTime, session.endTime)}
              </div>
              {session.userEmail && (
                <div className="flex items-center space-x-1">
                  <Mail className="w-3 h-3" />
                  <span className="text-blue-600">{session.userEmail}</span>
                </div>
              )}
              {session.userPhone && (
                <div className="flex items-center space-x-1">
                  <Phone className="w-3 h-3" />
                  <span className="text-green-600">{session.userPhone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversation Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation Transcript</CardTitle>
            <CardDescription>
              Complete conversation history with timestamps and page context
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDetail ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No messages in this conversation yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-50 border-l-4 border-blue-200 ml-8' 
                        : 'bg-gray-50 border-l-4 border-gray-200 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                          {message.role === 'user' ? 'User' : 'AI Bot'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                      {message.page && (
                        <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded">
                          Page: {message.page}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {message.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Reports</h1>
          <p className="text-gray-600">Monitor applicant conversations and AI interactions</p>
        </div>
        <div className="flex space-x-2">
          <Input
            placeholder="Search by business name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="abandoned">Abandoned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.total_sessions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active Now</p>
                <p className="text-2xl font-bold">{stats.active_sessions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Last 24h</p>
                <p className="text-2xl font-bold">{stats.recent_24h || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Total Messages</p>
                <p className="text-2xl font-bold">{stats.total_messages || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Avg Messages</p>
                <p className="text-2xl font-bold">{stats.avg_messages_per_session || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>
            All applicant AI chat sessions and interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading AI reports...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No conversation sessions found.</p>
              <p className="text-sm text-gray-400 mt-2">
                Sessions will appear here when applicants interact with the AI chat system.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session: ApplicantSession) => (
                <div
                  key={session.sessionId}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{session.businessName}</h3>
                        <Badge className={getStatusColor(session.status)}>
                          {session.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {session.totalMessages} messages
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Started {formatDate(session.startTime)}</span>
                        </span>
                        <span>Duration: {formatDuration(session.startTime, session.endTime)}</span>
                        {session.userEmail && (
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{session.userEmail}</span>
                          </span>
                        )}
                        {session.userPhone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{session.userPhone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSession(session);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Conversation
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}