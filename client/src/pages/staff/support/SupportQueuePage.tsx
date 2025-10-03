import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  User, 
  Phone,
  Mail,
  Plus,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// import { api } from '@/lib/queryClient';

interface SupportRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SupportQueuePage() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress'>('all');
  // @ts-ignore - Unused variable for demo
  const apiUnused = null;
  const { toast } = useToast();

  useEffect(() => {
    loadSupportRequests();
  }, []);

  const loadSupportRequests = async () => {
    try {
      setLoading(true);
      
      // Generate demo data for now
      const demoRequests: SupportRequest[] = [
        {
          id: '1',
          customerName: 'John Smith',
          customerEmail: 'john@example.com',
          customerPhone: '+15551234567',
          subject: 'Question about loan application',
          message: 'Hi, I submitted my loan application 3 days ago but haven\'t heard back. Can you please provide an update on the status?',
          priority: 'medium',
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah@example.com',
          customerPhone: '+15559876543',
          subject: 'Document upload issue',
          message: 'I\'m having trouble uploading my bank statements. The system keeps giving me an error.',
          priority: 'high',
          status: 'in_progress',
          assignedTo: 'Agent Smith',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      setRequests(demoRequests);
    } catch (error) {
      console.error('Failed to load support requests:', error);
      toast({
        title: "Failed to load support requests",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async (request: SupportRequest) => {
    try {
      setRequests(prev => prev.map(r => 
        r.id === request.id 
          ? { ...r, status: 'in_progress' as const, assignedTo: 'Current User' }
          : r
      ));
      
      toast({
        title: "Request assigned",
        description: `Request from ${request.customerName} assigned to you.`
      });
    } catch (error) {
      console.error('Failed to assign request:', error);
      toast({
        title: "Failed to assign request",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSendResponse = async () => {
    if (!selectedRequest || !response.trim()) return;
    
    try {
      setLoading(true);
      
      // Send email response (API integration disabled for demo)
      // await api('/api/o365/mail/send', {
      //   method: 'POST',
      //   body: {
      //     to: selectedRequest.customerEmail,
      //     subject: `Re: ${selectedRequest.subject}`,
      //     body: response.trim()
      //   }
      // });
      
      // Simulate API call for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update request status
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, status: 'resolved' as const, updatedAt: new Date().toISOString() }
          : r
      ));
      
      setResponse('');
      setSelectedRequest(null);
      
      toast({
        title: "Response sent successfully",
        description: `Email sent to ${selectedRequest.customerName}`
      });
    } catch (error) {
      console.error('Failed to send response:', error);
      toast({
        title: "Failed to send response",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-purple-100 text-purple-700';
      case 'waiting': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Queue</h1>
          <p className="text-gray-600">Manage customer support requests</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="all">All Requests</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
          <Button variant="outline" onClick={loadSupportRequests} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.status === 'open').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.priority === 'high' || r.priority === 'urgent').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">2.4h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Support Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No support requests found</p>
                  </div>
                ) : (
                  filteredRequests.map((request) => (
                    <Card 
                      key={request.id} 
                      className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedRequest?.id === request.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{request.customerName}</span>
                              <Badge className={getPriorityColor(request.priority)}>
                                {request.priority}
                              </Badge>
                              <Badge className={getStatusColor(request.status)}>
                                {request.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <h3 className="font-medium text-gray-900 mb-1">
                              {request.subject}
                            </h3>
                            
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {request.message}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>📧 {request.customerEmail}</span>
                              <span>📞 {request.customerPhone}</span>
                              <span>⏰ {new Date(request.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          {request.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignToMe(request);
                              }}
                            >
                              Assign to Me
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Request Details */}
        <div>
          {selectedRequest ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {selectedRequest.subject}
                  </h3>
                  <div className="flex gap-2 mb-3">
                    <Badge className={getPriorityColor(selectedRequest.priority)}>
                      {selectedRequest.priority}
                    </Badge>
                    <Badge className={getStatusColor(selectedRequest.status)}>
                      {selectedRequest.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Customer Message</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {selectedRequest.message}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Customer Info</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      {selectedRequest.customerName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      {selectedRequest.customerEmail}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      {selectedRequest.customerPhone}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Send Response</h4>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={6}
                    placeholder="Type your response to the customer..."
                    className="mb-2"
                  />
                  <Button 
                    onClick={handleSendResponse}
                    disabled={loading || !response.trim()}
                    className="w-full"
                  >
                    {loading ? 'Sending...' : 'Send Response'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">Select a request to view details and respond</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}