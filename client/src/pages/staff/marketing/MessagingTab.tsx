/**
 * Messaging Tab - Email, SMS, LinkedIn sequences
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Mail, MessageCircle, Linkedin, Play, Pause, Edit, Eye } from 'lucide-react';
import SequenceBuilder from '@/components/SequenceBuilder';
import type { MarketingSequence, SequenceStep } from '../../../../shared/marketing-schema';
import { useToast } from '@/hooks/use-toast';

export default function MessagingTab() {
  const { toast } = useToast();
  const [activeSequenceType, setActiveSequenceType] = useState('email');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['/api/marketing/sequences', activeSequenceType],
    staleTime: 30000
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['/api/marketing/templates', activeSequenceType],
    staleTime: 30000
  });

  const createSequenceMutation = useMutation({
    mutationFn: async (sequenceData: any) => {
      const response = await fetch('/api/marketing/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(sequenceData)
      });
      if (!response.ok) throw new Error('Failed to create sequence');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/sequences'] });
      setShowCreateDialog(false);
    }
  });

  const executeSequenceMutation = useMutation({
    mutationFn: async (sequenceId: string) => {
      const response = await fetch(`/api/marketing/sequences/${sequenceId}/execute`, {
        method: 'POST'});
      if (!response.ok) throw new Error('Failed to execute sequence');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/sequences'] });
    }
  });

  const mockSequences: MarketingSequence[] = [
    {
      id: '1',
      name: 'Business Loan Follow-up',
      type: 'email',
      steps: JSON.stringify([
        {
          id: 'step1',
          type: 'email',
          name: 'Welcome Email',
          config: { subject: 'Welcome to our business loan program', content: 'Thank you for your interest...' }
        },
        {
          id: 'step2',
          type: 'delay',
          name: 'Wait 3 days',
          config: { delayDays: 3 }
        },
        {
          id: 'step3',
          type: 'email',
          name: 'Follow-up Email',
          config: { subject: 'Questions about your loan application?', content: 'We\'re here to help...' }
        }
      ]),
      contactIds: JSON.stringify(['c1', 'c2', 'c3']),
      status: 'active',
      totalContacts: 245,
      completedContacts: 89,
      openRate: '68.5',
      clickRate: '12.3',
      replyRate: '4.7',
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Abandoned Application Recovery',
      type: 'sms',
      steps: JSON.stringify([
        {
          id: 'step1',
          type: 'sms',
          name: 'Reminder SMS',
          config: { content: 'Hi! You started a loan application but didn\'t finish. Need help? Reply HELP' }
        },
        {
          id: 'step2',
          type: 'delay',
          name: 'Wait 2 days',
          config: { delayDays: 2 }
        },
        {
          id: 'step3',
          type: 'sms',
          name: 'Final reminder',
          config: { content: 'Last chance - complete your application in 5 minutes: [LINK]' }
        }
      ]),
      contactIds: JSON.stringify(['c4', 'c5']),
      status: 'active',
      totalContacts: 87,
      completedContacts: 34,
      openRate: '92.1',
      clickRate: '28.4',
      replyRate: '15.2',
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'LinkedIn Outreach - C-Suite',
      type: 'linkedin',
      steps: JSON.stringify([
        {
          id: 'step1',
          type: 'linkedin',
          name: 'Connection Request',
          config: { content: 'Hi [NAME], I help businesses like yours secure funding. Would love to connect!' }
        },
        {
          id: 'step2',
          type: 'delay',
          name: 'Wait 5 days',
          config: { delayDays: 5 }
        },
        {
          id: 'step3',
          type: 'linkedin',
          name: 'Follow-up Message',
          config: { content: 'Thanks for connecting! I have some funding options that might interest you...' }
        }
      ]),
      contactIds: JSON.stringify(['c6']),
      status: 'draft',
      totalContacts: 12,
      completedContacts: 0,
      openRate: null,
      clickRate: null,
      replyRate: null,
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const filteredSequences = mockSequences.filter(s => s.type === activeSequenceType);

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      draft: 'bg-gray-100 text-gray-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-blue-100 text-blue-700'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageCircle className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const handleSequenceSave = (steps: SequenceStep[], metadata: any) => {
    createSequenceMutation.mutate({
      name: metadata.name,
      type: activeSequenceType,
      steps: steps,
      description: metadata.description
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Messaging Sequences</h2>
          <p className="text-gray-600">Create and manage automated messaging campaigns</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => toast({title: "New Sequence", description: "Sequence builder wizard coming soon"})}>
              <Plus className="h-4 w-4 mr-2" />
              New Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create {activeSequenceType.toUpperCase()} Sequence</DialogTitle>
            </DialogHeader>
            <SequenceBuilder
              stepTypes={activeSequenceType === 'email' 
                ? ['email', 'delay', 'wait', 'tag', 'condition']
                : activeSequenceType === 'sms'
                ? ['sms', 'delay', 'wait', 'tag']
                : ['linkedin', 'delay', 'wait', 'tag']
              }
              onSave={handleSequenceSave}
              templates={templates}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeSequenceType} onValueChange={setActiveSequenceType}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="flex items-center gap-2">
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeSequenceType} className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredSequences.filter(s => s.status === 'active').length}
                </div>
                <p className="text-xs text-gray-500">Currently running</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredSequences.reduce((sum, s) => sum + (s.totalContacts || 0), 0)}
                </div>
                <p className="text-xs text-gray-500">In all sequences</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(filteredSequences
                    .filter(s => s.openRate)
                    .reduce((sum, s) => sum + parseFloat(s.openRate!), 0) / 
                    filteredSequences.filter(s => s.openRate).length || 0)}%
                </div>
                <p className="text-xs text-gray-500">Across sequences</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Reply Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(filteredSequences
                    .filter(s => s.replyRate)
                    .reduce((sum, s) => sum + parseFloat(s.replyRate!), 0) / 
                    filteredSequences.filter(s => s.replyRate).length || 0)}%
                </div>
                <p className="text-xs text-gray-500">Response rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Sequences List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSequences.map((sequence) => {
              const steps = JSON.parse(sequence.steps as string) as SequenceStep[];
              
              return (
                <Card key={sequence.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(sequence.type)}
                          <CardTitle className="text-lg">{sequence.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={getStatusColor(sequence.status!)}>
                            {sequence.status}
                          </Badge>
                          <Badge variant="outline">
                            {steps.length} steps
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => toast({title: "View Sequence", description: "Sequence details viewer coming soon"})}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Contacts:</span>
                        <span className="font-semibold ml-2">{sequence.totalContacts}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-semibold ml-2">{sequence.completedContacts}</span>
                      </div>
                      {sequence.openRate && (
                        <div>
                          <span className="text-gray-600">Open Rate:</span>
                          <span className="font-semibold ml-2">{sequence.openRate}%</span>
                        </div>
                      )}
                      {sequence.replyRate && (
                        <div>
                          <span className="text-gray-600">Reply Rate:</span>
                          <span className="font-semibold ml-2">{sequence.replyRate}%</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${((sequence.completedContacts || 0) / (sequence.totalContacts || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {sequence.status === 'draft' ? (
                        <Button 
                          size="sm" 
                          onClick={() => executeSequenceMutation.mutate(sequence.id)}
                          disabled={executeSequenceMutation.isPending}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => toast({title: "Pause Sequence", description: "Sequence pause functionality coming soon"})}>
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => toast({title: "Edit Sequence", description: "Sequence editor coming soon"})}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast({title: "Sequence Analytics", description: "Sequence performance analytics coming soon"})}>
                        <Eye className="h-3 w-3 mr-1" />
                        Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredSequences.length === 0 && (
            <div className="text-center py-12">
              {getTypeIcon(activeSequenceType)}
              <p className="text-gray-500 mb-4 mt-4">
                No {activeSequenceType} sequences created yet
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First {activeSequenceType.toUpperCase()} Sequence
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}