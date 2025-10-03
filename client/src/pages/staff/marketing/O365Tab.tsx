/**
 * Office 365 Tab - Calendar, Email, Contacts integration
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Mail, Users, Plus, Sync, Clock, MapPin, Video, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function O365Tab() {
  const { toast } = useToast();
  const [showCreateEventDialog, setShowCreateEventDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');
  const queryClient = useQueryClient();

  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/marketing/o365/calendar'],
    staleTime: 30000
  });

  const { data: emailThreads = [], isLoading: emailsLoading } = useQuery({
    queryKey: ['/api/marketing/o365/emails', selectedContact],
    staleTime: 30000
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch('/api/marketing/o365/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(eventData)
      });
      if (!response.ok) throw new Error('Failed to create event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/o365/calendar'] });
      setShowCreateEventDialog(false);
    }
  });

  const syncContactsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/marketing/o365/contacts/sync', {
        method: 'POST'});
      if (!response.ok) throw new Error('Failed to sync contacts');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/o365/contacts'] });
    }
  });

  // Mock data for demonstration
  const mockEvents = [
    {
      id: '1',
      subject: 'Client Meeting - ABC Corp',
      start: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      end: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
      location: 'Conference Room A',
      attendees: ['john@abccorp.com', 'sarah@ourcompany.com'],
      isAllDay: false,
      importance: 'high'
    },
    {
      id: '2',
      subject: 'Loan Application Review',
      start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      end: new Date(Date.now() + 25 * 60 * 60 * 1000),
      location: 'Online Meeting',
      attendees: ['prospect@business.com'],
      isAllDay: false,
      importance: 'normal'
    },
    {
      id: '3',
      subject: 'Team Standup',
      start: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
      end: new Date(Date.now() + 48.5 * 60 * 60 * 1000),
      location: 'Teams Meeting',
      attendees: ['team@ourcompany.com'],
      isAllDay: false,
      importance: 'normal'
    }
  ];

  const mockEmailThreads = [
    {
      id: '1',
      subject: 'Business Loan Application - ABC Corp',
      participants: ['john@abccorp.com', 'loans@ourcompany.com'],
      messageCount: 5,
      lastMessage: 'Thank you for the additional documents. We will review and get back to you within 2 business days.',
      lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isRead: true,
      importance: 'high'
    },
    {
      id: '2',
      subject: 'Follow-up: Equipment Financing Options',
      participants: ['sarah@manufacturing.com', 'sales@ourcompany.com'],
      messageCount: 3,
      lastMessage: 'I am interested in the 5-year term option. Can we schedule a call to discuss?',
      lastMessageTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      isRead: false,
      importance: 'normal'
    }
  ];

  const currentEvents = calendarEvents.length > 0 ? calendarEvents : mockEvents;
  const currentEmailThreads = emailThreads.length > 0 ? emailThreads : mockEmailThreads;

  const getImportanceBadge = (importance: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      normal: 'bg-blue-100 text-blue-700',
      low: 'bg-gray-100 text-gray-700'
    };
    return colors[importance as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeUntilEvent = (start: Date) => {
    const now = new Date();
    const diff = new Date(start).getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (diff > 0) return 'starting soon';
    return 'ongoing';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Office 365 Integration</h2>
          <p className="text-gray-600">Manage calendar, emails, and contacts from Outlook</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline"
            onClick={() => syncContactsMutation.mutate()}
            disabled={syncContactsMutation.isPending}
          >
            <Sync className="h-4 w-4 mr-2" />
            {syncContactsMutation.isPending ? 'Syncing...' : 'Sync Contacts'}
          </Button>
          
          <Dialog open={showCreateEventDialog} onOpenChange={setShowCreateEventDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setShowCreateEventDialog(true);
                toast({title: "Creating Meeting", description: "Opening calendar interface..."});
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Calendar Event</DialogTitle>
              </DialogHeader>
              <CreateEventForm 
                onSubmit={(data) => createEventMutation.mutate(data)}
                isLoading={createEventMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Threads
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentEvents.filter(e => 
                    new Date(e.start).toDateString() === new Date().toDateString()
                  ).length}
                </div>
                <p className="text-xs text-gray-500">Scheduled meetings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentEvents.filter(e => {
                    const eventDate = new Date(e.start);
                    const today = new Date();
                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return eventDate >= today && eventDate <= weekFromNow;
                  }).length}
                </div>
                <p className="text-xs text-gray-500">Upcoming events</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentEvents.filter(e => e.importance === 'high').length}
                </div>
                <p className="text-xs text-gray-500">Important meetings</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{event.subject}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getImportanceBadge(event.importance)}>
                          {event.importance}
                        </Badge>
                        <Badge variant="outline">
                          {getTimeUntilEvent(event.start)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{formatDateTime(event.start)} - {formatDateTime(event.end)}</span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      const outlookUrl = `https://outlook.office.com/calendar/deeplink/compose?subject=${encodeURIComponent(event.subject)}`;
                      window.location.href = outlookUrl;
                      toast({title: "Opening in Outlook", description: "Launching external Outlook..."});
                    }}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open in Outlook
                    </Button>
                    {event.location?.includes('Teams') && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const teamsUrl = event.location?.includes('Teams') ? 
                          'https://teams.microsoft.com/' : 
                          `https://teams.microsoft.com/l/meetup-join/meeting_url`;
                        window.location.href = teamsUrl;
                        toast({title: "Joining Meeting", description: "Opening Teams meeting..."});
                      }}>
                        <Video className="h-3 w-3 mr-1" />
                        Join Meeting
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {currentEvents.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No calendar events found</p>
              <Button onClick={() => setShowCreateEventDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Event
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Email Threads Tab */}
        <TabsContent value="emails" className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Input
              placeholder="Filter by contact email"
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="space-y-4">
            {currentEmailThreads.map((thread) => (
              <Card key={thread.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{thread.subject}</h3>
                        {!thread.isRead && (
                          <Badge className="bg-blue-100 text-blue-700">Unread</Badge>
                        )}
                        <Badge className={getImportanceBadge(thread.importance)}>
                          {thread.importance}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Participants:</strong> {thread.participants.join(', ')}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        <strong>Messages:</strong> {thread.messageCount} • 
                        <strong> Last activity:</strong> {formatDateTime(thread.lastMessageTime)}
                      </div>
                      
                      <p className="text-sm bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                        {thread.lastMessage}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => {
                      const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(email.subject)}`;
                      window.location.href = outlookUrl;
                      toast({title: "Opening Email", description: "Launching Outlook web app..."});
                    }}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open in Outlook
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast({title: "Reply Email", description: "Email reply functionality coming soon"})}>
                      <Mail className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {currentEmailThreads.length === 0 && (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No email threads found</p>
              <p className="text-sm text-gray-400">
                {selectedContact ? 'Try a different contact email' : 'Connect your Outlook account to see email threads'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Outlook contacts sync</p>
            <p className="text-sm text-gray-400 mb-4">
              Sync your Outlook contacts with the CRM to maintain unified contact records
            </p>
            <Button 
              onClick={() => syncContactsMutation.mutate()}
              disabled={syncContactsMutation.isPending}
            >
              <Sync className="h-4 w-4 mr-2" />
              {syncContactsMutation.isPending ? 'Syncing...' : 'Sync Outlook Contacts'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateEventForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: any) => void; 
  isLoading: boolean; 
}) {
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    start: '',
    end: '',
    location: '',
    attendees: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData = {
      ...formData,
      start: new Date(formData.start),
      end: new Date(formData.end),
      attendees: formData.attendees.split(',').map(email => email.trim()).filter(Boolean)
    };
    
    onSubmit(eventData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Subject</label>
        <Input
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Meeting subject"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <Input
            type="datetime-local"
            value={formData.start}
            onChange={(e) => setFormData({ ...formData, start: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Time</label>
          <Input
            type="datetime-local"
            value={formData.end}
            onChange={(e) => setFormData({ ...formData, end: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Location</label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Meeting location or online link"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Attendees</label>
        <Input
          value={formData.attendees}
          onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
          placeholder="email1@domain.com, email2@domain.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Input
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder="Meeting description"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => toast({title: "Cancel", description: "Event creation cancelled"})}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}