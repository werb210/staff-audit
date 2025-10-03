/**
 * Audiences Tab - CRM audience management and sync
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Users, Sync, Filter, Target, Eye } from 'lucide-react';
import type { RetargetingAudience } from '../../../../shared/marketing-schema';
import { useToast } from '@/hooks/use-toast';

export default function AudiencesTab() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: audiences = [], isLoading } = useQuery({
    queryKey: ['/api/marketing/audiences'],
    staleTime: 30000
  });

  const createAudienceMutation = useMutation({
    mutationFn: async (audienceData: any) => {
      const response = await fetch('/api/marketing/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(audienceData)
      });
      if (!response.ok) throw new Error('Failed to create audience');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/audiences'] });
      setShowCreateDialog(false);
    }
  });

  const syncAudienceMutation = useMutation({
    mutationFn: async ({ id, platform }: { id: string; platform: string }) => {
      const response = await fetch(`/api/marketing/audiences/${id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ platform })
      });
      if (!response.ok) throw new Error('Failed to sync audience');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/audiences'] });
    }
  });

  const mockAudiences: RetargetingAudience[] = [
    {
      id: '1',
      name: 'Email Opened - Business Loans',
      description: 'Contacts who opened business loan emails in the last 30 days',
      source: 'email_opened',
      platform: 'google',
      contactIds: ['c1', 'c2', 'c3'],
      filters: { tags: ['business_loan'], emailOpened: true },
      audienceId: 'gads_aud_123',
      syncStatus: 'synced',
      lastSyncAt: new Date(),
      totalContacts: 247,
      matchRate: '84.2',
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Abandoned Applications',
      description: 'Users who started but didn\'t complete application',
      source: 'abandoned_app',
      platform: 'facebook',
      contactIds: ['c4', 'c5', 'c6'],
      filters: { applicationStatus: 'incomplete', daysSince: 7 },
      audienceId: 'fb_aud_456',
      syncStatus: 'pending',
      lastSyncAt: null,
      totalContacts: 156,
      matchRate: null,
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'High-Value Prospects',
      description: 'Contacts with loan amount > $500K',
      source: 'manual',
      platform: 'linkedin',
      contactIds: ['c7', 'c8'],
      filters: { loanAmount: { min: 500000 } },
      audienceId: 'li_aud_789',
      syncStatus: 'failed',
      lastSyncAt: new Date(),
      totalContacts: 43,
      matchRate: '72.1',
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const getSyncStatusColor = (status: string) => {
    const colors = {
      synced: 'bg-green-100 text-green-700',
      syncing: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      google: '🔍',
      facebook: '📘',
      linkedin: '💼',
      twitter: '🐦',
      tiktok: '🎵'
    };
    return icons[platform as keyof typeof icons] || '📊';
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
          <h2 className="text-2xl font-bold">Audiences</h2>
          <p className="text-gray-600">Create and sync audiences across platforms</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => toast({title: "Create Audience", description: "Audience creation wizard coming soon"})}>
              <Plus className="h-4 w-4 mr-2" />
              Create Audience
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Audience</DialogTitle>
            </DialogHeader>
            <CreateAudienceForm 
              onSubmit={(data) => createAudienceMutation.mutate(data)}
              isLoading={createAudienceMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Audiences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAudiences.length}</div>
            <p className="text-xs text-gray-500">Across all platforms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockAudiences.reduce((sum, a) => sum + (a.totalContacts || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">In all audiences</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockAudiences.filter(a => a.syncStatus === 'synced').length}
            </div>
            <p className="text-xs text-gray-500">Successfully synced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Match Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(mockAudiences
                .filter(a => a.matchRate)
                .reduce((sum, a) => sum + parseFloat(a.matchRate!), 0) / 
                mockAudiences.filter(a => a.matchRate).length || 0)}%
            </div>
            <p className="text-xs text-gray-500">Platform match rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Audiences List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockAudiences.map((audience) => (
          <Card key={audience.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getPlatformIcon(audience.platform!)}</span>
                    <CardTitle className="text-lg">{audience.name}</CardTitle>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{audience.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={getSyncStatusColor(audience.syncStatus!)}>
                      {audience.syncStatus}
                    </Badge>
                    <Badge variant="outline">
                      {audience.platform?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toast({title: "View Audience", description: "Audience details viewer coming soon"})}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Contacts:</span>
                  <span className="font-semibold ml-2">{audience.totalContacts?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Match Rate:</span>
                  <span className="font-semibold ml-2">
                    {audience.matchRate ? `${audience.matchRate}%` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Source:</span>
                  <span className="font-semibold ml-2 capitalize">
                    {audience.source?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="font-semibold ml-2">
                    {audience.lastSyncAt 
                      ? new Date(audience.lastSyncAt).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => syncAudienceMutation.mutate({ 
                    id: audience.id, 
                    platform: audience.platform! 
                  })}
                  disabled={syncAudienceMutation.isPending}
                >
                  <Sync className="h-3 w-3 mr-1" />
                  {syncAudienceMutation.isPending ? 'Syncing...' : 'Sync'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast({title: "Edit Filters", description: "Audience filter editor coming soon"})}>
                  <Filter className="h-3 w-3 mr-1" />
                  Edit Filters
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast({title: "Use in Campaign", description: "Campaign audience targeting coming soon"})}>
                  <Target className="h-3 w-3 mr-1" />
                  Use in Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockAudiences.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No audiences created yet</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Audience
          </Button>
        </div>
      )}
    </div>
  );
}

function CreateAudienceForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: any) => void; 
  isLoading: boolean; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source: 'manual',
    platform: 'google',
    filters: {}
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Audience Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter audience name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Platform</label>
          <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="google" className="text-gray-900 hover:bg-gray-100">Google Ads</SelectItem>
              <SelectItem value="facebook" className="text-gray-900 hover:bg-gray-100">Facebook</SelectItem>
              <SelectItem value="linkedin" className="text-gray-900 hover:bg-gray-100">LinkedIn</SelectItem>
              <SelectItem value="twitter" className="text-gray-900 hover:bg-gray-100">Twitter/X</SelectItem>
              <SelectItem value="tiktok" className="text-gray-900 hover:bg-gray-100">TikTok</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe this audience"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Source</label>
        <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 shadow-lg">
            <SelectItem value="manual" className="text-gray-900 hover:bg-gray-100">Manual Selection</SelectItem>
            <SelectItem value="email_opened" className="text-gray-900 hover:bg-gray-100">Email Opened</SelectItem>
            <SelectItem value="ad_clicked" className="text-gray-900 hover:bg-gray-100">Ad Clicked</SelectItem>
            <SelectItem value="abandoned_app" className="text-gray-900 hover:bg-gray-100">Abandoned Application</SelectItem>
            <SelectItem value="form_filled" className="text-gray-900 hover:bg-gray-100">Form Filled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => toast({title: "Cancel", description: "Audience creation cancelled"})}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Audience'}
        </Button>
      </div>
    </form>
  );
}