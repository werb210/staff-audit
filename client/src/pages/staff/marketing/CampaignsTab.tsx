/**
 * Campaigns Tab - Multi-platform campaign management
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Play, Pause, BarChart, DollarSign, MousePointer, TrendingUp } from 'lucide-react';
import type { MarketingCampaign } from '../../../../shared/marketing-schema';
import { useToast } from '@/hooks/use-toast';

export default function CampaignsTab() {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['/api/marketing/campaigns', selectedPlatform],
    staleTime: 30000
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(campaignData)
      });
      if (!response.ok) throw new Error('Failed to create campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
      setShowCreateDialog(false);
    }
  });

  const platforms = [
    { id: 'all', name: 'All Platforms', color: 'gray' },
    { id: 'google', name: 'Google Ads', color: 'blue' },
    { id: 'facebook', name: 'Facebook', color: 'blue' },
    { id: 'linkedin', name: 'LinkedIn', color: 'blue' },
    { id: 'youtube', name: 'YouTube', color: 'red' },
    { id: 'twitter', name: 'Twitter/X', color: 'black' },
    { id: 'tiktok', name: 'TikTok', color: 'black' }
  ];

  const mockCampaigns: MarketingCampaign[] = [
    {
      id: '1',
      platform: 'google',
      name: 'Business Loan Lead Gen Q4',
      campaignId: 'gads_123456',
      status: 'active',
      objective: 'conversions',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-12-31'),
      dailyBudget: '150.00',
      totalSpend: '4250.00',
      clicks: 1247,
      impressions: 48392,
      conversions: 28,
      cpa: '151.79',
      roas: '24.5',
      targetingData: {},
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      platform: 'linkedin',
      name: 'Professional Services Outreach',
      campaignId: 'li_789012',
      status: 'active',
      objective: 'traffic',
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-11-30'),
      dailyBudget: '100.00',
      totalSpend: '2180.00',
      clicks: 542,
      impressions: 15680,
      conversions: 12,
      cpa: '181.67',
      roas: '18.2',
      targetingData: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const filteredCampaigns = selectedPlatform === 'all' 
    ? mockCampaigns 
    : mockCampaigns.filter(c => c.platform === selectedPlatform);

  const getPlatformBadgeColor = (platform: string) => {
    const colors = {
      google: 'bg-blue-100 text-blue-700',
      facebook: 'bg-blue-100 text-blue-700',
      linkedin: 'bg-blue-100 text-blue-700',
      youtube: 'bg-red-100 text-red-700',
      twitter: 'bg-gray-100 text-gray-700',
      tiktok: 'bg-black text-white'
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-gray-100 text-gray-700'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
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
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campaigns</h2>
          <p className="text-gray-600">Manage campaigns across all platforms</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              {platforms.map(platform => (
                <SelectItem key={platform.id} value={platform.id} className="text-gray-900 hover:bg-gray-100">
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                toast({
                  title: "Creating Campaign",
                  description: "Opening campaign builder..."
                });
                setShowCreateDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
              </DialogHeader>
              <CreateCampaignForm 
                onSubmit={(data) => createCampaignMutation.mutate(data)}
                isLoading={createCampaignMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${filteredCampaigns.reduce((sum, c) => sum + parseFloat(c.totalSpend || '0'), 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">All campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0)}
            </div>
            <p className="text-xs text-gray-500">Total conversions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(filteredCampaigns.reduce((sum, c) => sum + parseFloat(c.roas || '0'), 0) / filteredCampaigns.length || 0).toFixed(1)}x
            </div>
            <p className="text-xs text-gray-500">Return on ad spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getPlatformBadgeColor(campaign.platform)}>
                      {campaign.platform.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusBadgeColor(campaign.status!)}>
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  window.location.href = `/staff/marketing/campaigns/${campaign.id}`;
                  toast({title: "Opening Campaign", description: `Loading ${campaign.name} details...`});
                }}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Spend:</span>
                  <span className="font-semibold">${parseFloat(campaign.totalSpend || '0').toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Clicks:</span>
                  <span className="font-semibold">{campaign.clicks?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Conversions:</span>
                  <span className="font-semibold">{campaign.conversions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">ROAS:</span>
                  <span className="font-semibold">{campaign.roas}x</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => {
                  toast({
                    title: "Edit Campaign",
                    description: `Opening editor for ${campaign.name}...`
                  });
                  window.location.href = `/staff/marketing/campaigns/${campaign.id}/edit`;
                }}>
                  <Play className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const action = campaign.status === 'paused' ? 'resuming' : 'pausing';
                  toast({
                    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Campaign`,
                    description: `${action.charAt(0).toUpperCase() + action.slice(1)} "${campaign.name}"...`
                  });
                  // In real app: updateCampaignStatus(campaign.id, newStatus);
                }}>
                  <Pause className="h-3 w-3 mr-1" />
                  {campaign.status === 'paused' ? 'Resume' : 'Pause'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  toast({
                    title: "Campaign Analytics",
                    description: `Loading detailed analytics for "${campaign.name}"...`
                  });
                  window.location.href = `/staff/marketing/campaigns/${campaign.id}/analytics`;
                }}>
                  <BarChart className="h-3 w-3 mr-1" />
                  Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No campaigns found for the selected platform</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Campaign
          </Button>
        </div>
      )}
    </div>
  );
}

function CreateCampaignForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: any) => void; 
  isLoading: boolean; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    platform: 'google',
    objective: 'conversions',
    dailyBudget: '',
    startDate: '',
    endDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Campaign Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter campaign name"
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
              <SelectItem value="youtube" className="text-gray-900 hover:bg-gray-100">YouTube</SelectItem>
              <SelectItem value="twitter" className="text-gray-900 hover:bg-gray-100">Twitter/X</SelectItem>
              <SelectItem value="tiktok" className="text-gray-900 hover:bg-gray-100">TikTok</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Objective</label>
          <Select value={formData.objective} onValueChange={(value) => setFormData({ ...formData, objective: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="conversions" className="text-gray-900 hover:bg-gray-100">Conversions</SelectItem>
              <SelectItem value="traffic" className="text-gray-900 hover:bg-gray-100">Traffic</SelectItem>
              <SelectItem value="awareness" className="text-gray-900 hover:bg-gray-100">Brand Awareness</SelectItem>
              <SelectItem value="leads" className="text-gray-900 hover:bg-gray-100">Lead Generation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Daily Budget</label>
          <Input
            type="number"
            value={formData.dailyBudget}
            onChange={(e) => setFormData({ ...formData, dailyBudget: e.target.value })}
            placeholder="100.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => toast({title: "Cancel", description: "Campaign creation cancelled"})}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  );
}