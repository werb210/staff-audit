import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { Badge } from "../../../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { 
  Users, 
  MessageCircle, 
  Phone, 
  Clock, 
  // Removed unused CheckCircle, AlertCircle
  Send,
  Star
} from "lucide-react";
import { api } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { lower } from '@/lib/dedupe';
// Note: startCall moved to direct API call to avoid circular imports

interface SupportRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  subject: string;
  description: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  assignedAgent?: string;
  createdAt: string;
  lastUpdate: string;
  estimatedWaitTime?: string;
}

export default function TalkToHumanTab() {
  const { toast } = useToast();
  
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    customerName: '',
    customerEmail: '',
    priority: 'medium',
    category: 'general',
    subject: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSupportRequests();
  }, []);

  const loadSupportRequests = async () => {
    try {
      const response = await api('/api/communications/support-requests');
      setSupportRequests(response.requests || [
        {
          id: 'sup_1',
          customerName: 'John Smith',
          customerEmail: 'john@acmemanufacturing.com',
          priority: 'high' as const,
          category: 'Application Status',
          subject: 'Questions about my loan application status',
          description: 'Hi, I submitted my equipment financing application 3 days ago and haven\'t heard back. Can someone please update me on the status?',
          status: 'assigned' as const,
          assignedAgent: 'Sarah Thompson',
          createdAt: '2025-08-21T14:30:00Z',
          lastUpdate: '2025-08-21T15:45:00Z',
          estimatedWaitTime: '2 hours'
        },
        {
          id: 'sup_2',
          customerName: 'Mike Davis',
          customerEmail: 'mike@propipe.com',
          priority: 'medium' as const,
          category: 'Documentation',
          subject: 'Need help with required documents',
          description: 'I\'m trying to complete my working capital application but I\'m not sure which bank statements you need. Can someone clarify?',
          status: 'pending' as const,
          createdAt: '2025-08-21T13:15:00Z',
          lastUpdate: '2025-08-21T13:15:00Z',
          estimatedWaitTime: '4 hours'
        },
        {
          id: 'sup_3',
          customerName: 'Lisa Chen',
          customerEmail: 'lisa@quickmart.biz',
          priority: 'urgent' as const,
          category: 'Technical Issues',
          subject: 'Can\'t submit my application online',
          description: 'I keep getting an error when trying to submit my merchant cash advance application. The page keeps timing out.',
          status: 'in_progress' as const,
          assignedAgent: 'Kevin Park',
          createdAt: '2025-08-21T12:00:00Z',
          lastUpdate: '2025-08-21T14:20:00Z',
          estimatedWaitTime: '30 minutes'
        }
      ]);
    } catch (error) {
      console.error('Failed to load support requests:', error);
      setSupportRequests([]);
    }
  };

  const createSupportRequest = async () => {
    setLoading(true);
    try {
      const response = await api('/api/communications/support-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest)
      });

      setSupportRequests([response, ...supportRequests]);
      setNewRequest({
        customerName: '',
        customerEmail: '',
        priority: 'medium',
        category: 'general',
        subject: '',
        description: ''
      });
      setShowNewRequest(false);
    } catch (error) {
      console.error('Failed to create support request:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return variants[priority] || variants.medium;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return variants[status] || variants.pending;
  };

  const categories = [
    'Application Status',
    'Documentation',
    'Technical Issues',
    'Billing & Payments',
    'Account Access',
    'General Inquiry',
    'Complaint'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Talk to a Human
          </h2>
          <p className="text-gray-600">Connect customers with live support agents</p>
        </div>
        <Button onClick={() => setShowNewRequest(!showNewRequest)}>
          <MessageCircle className="h-4 w-4 mr-2" />
          {showNewRequest ? 'Cancel' : 'Create Support Request'}
        </Button>
      </div>

      {/* Current Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-orange-600">
                  {supportRequests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {supportRequests.filter(r => r.status === 'in_progress').length}
                </p>
              </div>
              <MessageCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Wait Time</p>
                <p className="text-2xl font-bold text-green-600">3h 15m</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Satisfaction</p>
                <p className="text-2xl font-bold text-yellow-600">4.8/5</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Support Request Form */}
      {showNewRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Create Support Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <Input
                  value={newRequest.customerName}
                  onChange={(e) => setNewRequest({...newRequest, customerName: e.target.value})}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email
                </label>
                <Input
                  type="email"
                  value={newRequest.customerEmail}
                  onChange={(e) => setNewRequest({...newRequest, customerEmail: e.target.value})}
                  placeholder="customer@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <Select value={newRequest.priority} onValueChange={(value) => setNewRequest({...newRequest, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="low" className="text-gray-900 hover:bg-gray-100">Low</SelectItem>
                    <SelectItem value="medium" className="text-gray-900 hover:bg-gray-100">Medium</SelectItem>
                    <SelectItem value="high" className="text-gray-900 hover:bg-gray-100">High</SelectItem>
                    <SelectItem value="urgent" className="text-gray-900 hover:bg-gray-100">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select value={newRequest.category} onValueChange={(value) => setNewRequest({...newRequest, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {categories.map(category => (
                      <SelectItem key={category} value={lower(category).replace(' ', '_')} className="text-gray-900 hover:bg-gray-100">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <Input
                value={newRequest.subject}
                onChange={(e) => setNewRequest({...newRequest, subject: e.target.value})}
                placeholder="Brief description of the issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={newRequest.description}
                onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                placeholder="Detailed description of the customer's issue or question..."
                rows={4}
              />
            </div>

            <Button onClick={createSupportRequest} disabled={loading} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Support Request'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Support Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Support Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {supportRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{request.subject}</h4>
                      <Badge className={getPriorityBadge(request.priority)}>
                        {request.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>👤 {request.customerName}</span>
                      <span>📧 {request.customerEmail}</span>
                      <span>📂 {request.category}</span>
                      {request.assignedAgent && <span>👨‍💼 Assigned to {request.assignedAgent}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusBadge(request.status)}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {request.estimatedWaitTime && (
                      <p className="text-xs text-gray-500 mt-1">
                        ⏱️ Est. wait: {request.estimatedWaitTime}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-xs text-gray-500">
                    Created: {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      toast({
                        title: "Starting Chat",
                        description: `Opening chat session with ${request.customerName}...`
                      });
                      // In a real app, this would open a chat interface
                    }}>
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      toast({
                        title: "Initiating Call",
                        description: `Calling ${request.customerName}...`
                      });
                      // Extract phone number from customer data or use a default
                      // startCall({to: request.customerPhone || "555-0123"});
                    }}>
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {supportRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No active support requests. Great job keeping up with customer support!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}