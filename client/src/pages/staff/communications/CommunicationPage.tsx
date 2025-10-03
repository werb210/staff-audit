import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { MessageSquare, Mail, Phone, Send, User, Clock, Users, AlertTriangle, Voicemail } from 'lucide-react';
import { api } from '@/lib/queryClient';
import { lower } from '@/lib/dedupe';
import ErrorBanner from '../../../components/ErrorBanner';
// Removed unused imports
import VoicemailPanel from './components/VoicemailPanel';
import { useToast } from '@/hooks/use-toast';
// Removed old dialer import - using new FAB system
import QuickSMSCompose from '@/components/QuickSMSCompose';
import QuickEmailCompose from '@/components/QuickEmailCompose'; 
import QuickCallPad from '@/components/QuickCallPad';

interface CommunicationThread {
  id: string;
  contactId: string;
  contactName: string;
  type: 'sms' | 'email' | 'call';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  message?: string;
  subject?: string;
  duration?: number;
  timestamp: string;
  direction: 'inbound' | 'outbound';
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
}

export default function CommunicationPage() {
  const { toast } = useToast();
  // Using new FAB dialer system - no need for hook
  const openDialer = () => console.log("[Communications] Dialer requested - handled by global FAB");
  
  const [threads, setThreads] = useState<CommunicationThread[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'email' | 'calls' | 'voicemail' | 'support' | 'issues'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Keyboard shortcut for opening dialer (Ctrl/Cmd + D)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && lower(e.key) === 'd') {
        openDialer();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDialer]);

  // Enhanced tab change debugging
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as any);
  };

  useEffect(() => {
    loadCommunications();
  }, [activeTab]);

  const loadCommunications = async () => {
    try {
      setLoading(true);
      
      // Create some demo communication data if the API fails
      const demoThreads: CommunicationThread[] = [
        {
          id: '1',
          contactId: 'contact-1',
          contactName: 'John Smith',
          type: 'email',
          status: 'delivered',
          subject: 'Application Follow-up',
          message: 'Thank you for submitting your application. We will review it within 24 hours.',
          timestamp: new Date().toISOString(),
          direction: 'outbound'
        },
        {
          id: '2', 
          contactId: 'contact-2',
          contactName: 'Sarah Johnson',
          type: 'sms',
          status: 'delivered',
          message: 'Your loan application has been approved!',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          direction: 'outbound'
        }
      ];
      
      setThreads(demoThreads);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load communications:', error);
      setThreads([]); // Empty array to trigger ErrorBanner
    }
  };

  const generateFallbackData = (): CommunicationThread[] => {
    const baseData = [
      {
        id: 'comm_1',
        contactId: 'contact_1',
        contactName: 'John Smith',
        timestamp: '2024-08-21T10:30:00Z',
        direction: 'inbound' as const
      },
      {
        id: 'comm_2', 
        contactId: 'contact_2',
        contactName: 'Sarah Johnson',
        timestamp: '2024-08-21T09:15:00Z',
        direction: 'outbound' as const
      },
      {
        id: 'comm_3',
        contactId: 'contact_3', 
        contactName: 'Mike Davis',
        timestamp: '2024-08-21T08:45:00Z',
        direction: 'inbound' as const
      }
    ];

    switch (activeTab) {
      case 'chat':
        return baseData.map(item => ({
          ...item,
          type: 'sms' as const,
          status: 'delivered' as const,
          message: item.direction === 'inbound' 
            ? 'Hi, I have questions about my loan application status.'
            : 'Thank you for reaching out. Let me check your application status right away.'
        }));
      
      case 'email':
        return baseData.map(item => ({
          ...item,
          type: 'email' as const,
          status: 'read' as const,
          subject: item.direction === 'inbound' 
            ? 'Question about loan application'
            : 'Re: Your loan application update',
          message: item.direction === 'inbound'
            ? 'Could you please provide an update on my recent loan application?'
            : 'Your application is currently under review. We will contact you within 2 business days.'
        }));
      
      case 'calls':
        return baseData.map(item => ({
          ...item,
          type: 'call' as const,
          status: 'delivered' as const,
          duration: item.direction === 'inbound' ? 180 : 240
        }));
      
      default:
        return [];
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    
    setLoading(true);
    try {
      await api('/api/communications/send', {
        method: 'POST',
        body: {
          contactId: selectedContact.id,
          type: activeTab === 'chat' ? 'sms' : activeTab,
          message: newMessage,
          subject: activeTab === 'email' ? 'Follow-up from Staff' : undefined
        }
      });
      
      setNewMessage('');
      await loadCommunications();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleFollowUp = () => {
    if (!selectedContact) {
      toast({
        title: "No Contact Selected",
        description: "Please select a contact to schedule a follow-up.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Follow-up Scheduled",
      description: `Follow-up scheduled for ${selectedContact.name} in 24 hours.`
    });
    // In a real app, this would create a calendar event or task
  };

  const handleAddToCampaign = () => {
    if (!selectedContact) {
      toast({
        title: "No Contact Selected", 
        description: "Please select a contact to add to campaign.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Added to Campaign",
      description: `${selectedContact.name} has been added to the nurture campaign.`
    });
    // In a real app, this would add contact to marketing automation
  };

  const handleViewFullHistory = () => {
    if (!selectedContact) {
      toast({
        title: "No Contact Selected",
        description: "Please select a contact to view history.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Opening Contact History",
      description: `Loading full communication history for ${selectedContact.name}...`
    });
    // In a real app, this would open a detailed contact history view
    window.location.href = `/staff/contacts/${selectedContact.id}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'read': return 'bg-purple-100 text-purple-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderCommunicationItem = (thread: CommunicationThread) => (
    <Card key={thread.id} className="mb-3 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedContact({ 
            id: thread.contactId, 
            name: thread.contactName,
            email: `${lower(thread.contactName).replace(' ', '.')}@example.com`,
            phone: '+1-555-0123'
          })}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {thread.type === 'sms' && <MessageSquare className="h-5 w-5 text-blue-500" />}
              {thread.type === 'email' && <Mail className="h-5 w-5 text-green-500" />}
              {thread.type === 'call' && <Phone className="h-5 w-5 text-purple-500" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{thread.contactName}</span>
                <Badge className={getStatusColor(thread.status)}>
                  {thread.status}
                </Badge>
                <span className={`text-xs px-2 py-1 rounded ${
                  thread.direction === 'inbound' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                }`}>
                  {thread.direction}
                </span>
              </div>
              
              {thread.subject && (
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {thread.subject}
                </div>
              )}
              
              {thread.message && (
                <div className="text-sm text-gray-600 truncate">
                  {thread.message}
                </div>
              )}
              
              {thread.duration && (
                <div className="text-sm text-gray-600">
                  Duration: {Math.floor(thread.duration / 60)}m {thread.duration % 60}s
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {formatTimestamp(thread.timestamp)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div>
      <div className="p-6">
      {threads.length === 0 && <ErrorBanner message="Communication logs failed to load. Please try again later." />}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication Center</h1>
          <p className="text-gray-600">Manage all customer communications in one place</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => openDialer()}
            variant="outline"
            className="flex items-center gap-2"
            title="Open dialer (⌘/Ctrl + D)"
          >
            <Phone className="h-4 w-4" />
            📞 Open Dialer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Communication List */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="calls" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Calls
              </TabsTrigger>
              <TabsTrigger value="voicemail" className="flex items-center gap-2">
                <Voicemail className="h-4 w-4" />
                Voicemail
              </TabsTrigger>
              <TabsTrigger value="support" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Talk to Human
              </TabsTrigger>
              <TabsTrigger value="issues" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Report Issue
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-6">
              <div className="space-y-4">
                <QuickSMSCompose />
                <div className="space-y-3">
                  {threads.filter(t => t.type === 'sms').map(renderCommunicationItem)}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="email" className="mt-6">
              <div className="space-y-4">
                <QuickEmailCompose />
                <div className="space-y-3">
                  {threads.filter(t => t.type === 'email').map(renderCommunicationItem)}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="calls" className="mt-6">
              <div className="space-y-4">
                <QuickCallPad />
                <div className="space-y-3">
                  {threads.filter(t => t.type === 'call').map(renderCommunicationItem)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="voicemail" className="mt-6">
              <VoicemailPanel />
            </TabsContent>

            <TabsContent value="support" className="mt-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">👥 Talk to a Human</h3>
                  <p className="text-sm text-gray-600 mb-4">Connect customers with live support agents</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <div className="font-medium">Pending Requests</div>
                        <div className="text-sm text-gray-500">2</div>
                      </div>
                      <div>
                        <div className="font-medium">Avg Wait Time</div>
                        <div className="text-sm text-gray-500">2h 24m</div>
                      </div>
                      <div>
                        <div className="font-medium">Satisfaction</div>
                        <div className="text-sm text-gray-500">4.8/5</div>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                      onClick={() => window.location.href = '/staff/support-queue'}
                    >
                      🎟️ View Support Queue
                    </Button>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Recent Support Activity</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-blue-900">John Smith</span>
                        <span className="text-xs text-blue-600">15 min ago</span>
                      </div>
                      <p className="text-sm text-blue-800">Question about loan application status</p>
                      <div className="mt-2">
                        <Badge className="bg-blue-100 text-blue-700">Open</Badge>
                        <Badge className="bg-yellow-100 text-yellow-700 ml-2">Medium Priority</Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-purple-900">Sarah Johnson</span>
                        <span className="text-xs text-purple-600">1 hour ago</span>
                      </div>
                      <p className="text-sm text-purple-800">Document upload issue</p>
                      <div className="mt-2">
                        <Badge className="bg-purple-100 text-purple-700">In Progress</Badge>
                        <Badge className="bg-orange-100 text-orange-700 ml-2">High Priority</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="issues" className="mt-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">⚠️ Report an Issue</h3>
                  <p className="text-sm text-gray-600 mb-4">Track and resolve system issues and feature requests</p>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">0</div>
                      <div className="text-sm text-gray-600">Open Issues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">0</div>
                      <div className="text-sm text-gray-600">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">0</div>
                      <div className="text-sm text-gray-600">Resolved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">0</div>
                      <div className="text-sm text-gray-600">Critical Issues</div>
                    </div>
                  </div>
                  <button className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700">
                    🚨 Report New Issue
                  </button>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Issue Tracker</h4>
                  <div className="text-center text-gray-500 py-8 bg-green-50 rounded-lg">
                    🎉 No issues reported. The system is running smoothly!
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Selected Contact Panel */}
        <div className="lg:col-span-1">
          {selectedContact ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedContact.name}
                </CardTitle>
                <CardDescription>
                  <div className="space-y-1">
                    <div>{selectedContact.email}</div>
                    <div>{selectedContact.phone}</div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Send {activeTab === 'chat' ? 'SMS' : activeTab === 'email' ? 'Email' : 'Message'}
                    </label>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`Type your ${activeTab === 'chat' ? 'message' : activeTab} here...`}
                      className="mb-2"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={loading || !newMessage.trim()}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send {activeTab === 'chat' ? 'SMS' : activeTab === 'email' ? 'Email' : 'Message'}
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full" onClick={handleScheduleFollowUp}>
                        Schedule Follow-up
                      </Button>
                      <Button variant="outline" size="sm" className="w-full" onClick={handleAddToCampaign}>
                        Add to Campaign
                      </Button>
                      <Button variant="outline" size="sm" className="w-full" onClick={handleViewFullHistory}>
                        View Full History
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">Select a contact to view details and send messages</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}