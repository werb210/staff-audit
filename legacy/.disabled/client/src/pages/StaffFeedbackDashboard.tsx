import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Clock, CheckCircle, AlertCircle, User, Calendar, Filter } from 'lucide-react';

interface Feedback {
  id: number;
  userId: string | null;
  text: string;
  conversation: string | null;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  category: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo: string | null;
  resolution: string | null;
  tags: string[] | null;
  metadata: any;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface FeedbackStats {
  total: number;
  new: number;
  in_progress: number;
  resolved: number;
  closed: number;
  high_priority: number;
  recent_24h: number;
}

export function StaffFeedbackDashboard() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [resolution, setResolution] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch feedback list
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['feedback', selectedStatus, selectedPriority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);
      
      const response = await fetch(`/api/feedback?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }

      return response.json();
    }
  });

  // Fetch feedback statistics
  const { data: statsData } = useQuery({
    queryKey: ['feedback-stats'],
    queryFn: async () => {
      const response = await fetch('/api/feedback/stats/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback stats');
      }

      return response.json() as FeedbackStats;
    }
  });

  // Update feedback mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update feedback');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-stats'] });
      setSelectedFeedback(null);
      setResolution('');
      
      toast({
        title: "Feedback Updated",
        description: "Feedback status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleStatusUpdate = (feedbackId: number, status: string) => {
    const updates: any = { status };
    
    if (status === 'resolved' && resolution.trim()) {
      updates.resolution = resolution.trim();
    }

    updateFeedbackMutation.mutate({ id: feedbackId, updates });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const feedback = feedbackData?.feedback || [];
  const stats = statsData || {};

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback Dashboard</h1>
          <p className="text-gray-600">Monitor and respond to user feedback and reports</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{stats.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">New</p>
                <p className="text-2xl font-bold">{stats.new || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">{stats.in_progress || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Resolved</p>
                <p className="text-2xl font-bold">{stats.resolved || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Closed</p>
                <p className="text-2xl font-bold">{stats.closed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">High Priority</p>
                <p className="text-2xl font-bold">{stats.high_priority || 0}</p>
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
      </div>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>
            All user feedback and reports from the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading feedback...</p>
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No feedback found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item: Feedback) => (
                <div
                  key={item.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedFeedback(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        {item.category && (
                          <Badge variant="outline">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        ID: #{item.id} • {formatDate(item.createdAt)}
                      </p>
                      <p className="text-gray-900 line-clamp-2">
                        {item.text}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {item.status === 'new' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusUpdate(item.id, 'in_progress');
                          }}
                        >
                          Start Review
                        </Button>
                      )}
                      {item.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusUpdate(item.id, 'resolved');
                          }}
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Feedback #{selectedFeedback.id}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFeedback(null)}
                >
                  ×
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getPriorityColor(selectedFeedback.priority)}>
                  {selectedFeedback.priority}
                </Badge>
                <Badge className={getStatusColor(selectedFeedback.status)}>
                  {selectedFeedback.status.replace('_', ' ')}
                </Badge>
                {selectedFeedback.category && (
                  <Badge variant="outline">
                    {selectedFeedback.category}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Feedback Text</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  {selectedFeedback.text}
                </p>
              </div>

              {selectedFeedback.conversation && (
                <div>
                  <h4 className="font-medium mb-2">Context</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedFeedback.conversation}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Created:</span> {formatDate(selectedFeedback.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Updated:</span> {formatDate(selectedFeedback.updatedAt)}
                </div>
              </div>

              {selectedFeedback.resolution && (
                <div>
                  <h4 className="font-medium mb-2">Resolution</h4>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">
                    {selectedFeedback.resolution}
                  </p>
                </div>
              )}

              {selectedFeedback.status === 'in_progress' && (
                <div className="space-y-2">
                  <h4 className="font-medium">Add Resolution</h4>
                  <Textarea
                    placeholder="Describe how this issue was resolved..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                {selectedFeedback.status === 'new' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedFeedback.id, 'in_progress')}
                    disabled={updateFeedbackMutation.isPending}
                  >
                    Start Review
                  </Button>
                )}
                {selectedFeedback.status === 'in_progress' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedFeedback.id, 'resolved')}
                    disabled={updateFeedbackMutation.isPending}
                  >
                    Mark Resolved
                  </Button>
                )}
                {selectedFeedback.status === 'resolved' && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(selectedFeedback.id, 'closed')}
                    disabled={updateFeedbackMutation.isPending}
                  >
                    Close
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedFeedback(null)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}