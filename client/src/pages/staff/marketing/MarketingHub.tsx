/**
 * Marketing Hub - Main Dashboard
 * Unified interface for all marketing activities
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Target, 
  Users, 
  MessageSquare, 
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  Mail,
  MessageCircle,
  Linkedin,
  Calendar,
  Plus
} from 'lucide-react';
import CampaignsTab from './CampaignsTab';
import AudiencesTab from './AudiencesTab';
import MessagingTab from './MessagingTab';
import AttributionTab from './AttributionTab';
import O365Tab from './O365Tab';

interface MarketingStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalRevenue: number;
  roas: number;
  totalContacts: number;
  activeSequences: number;
  emailsSent: number;
  smsSent: number;
  linkedinMessagesSent: number;
}

export default function MarketingHub() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch marketing stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/marketing/stats'],
    staleTime: 30000
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['/api/marketing/activity/recent'],
    staleTime: 30000
  });

  const mockStats: MarketingStats = {
    totalCampaigns: 12,
    activeCampaigns: 8,
    totalSpend: 15420.50,
    totalRevenue: 485000,
    roas: 31.4,
    totalContacts: 2834,
    activeSequences: 5,
    emailsSent: 1247,
    smsSent: 892,
    linkedinMessagesSent: 156
  };

  const currentStats = stats || mockStats;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'audiences', label: 'Audiences', icon: Users },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'attribution', label: 'Attribution', icon: TrendingUp },
    { id: 'o365', label: 'Office 365', icon: Calendar }
  ];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading marketing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketing Hub</h1>
          <p className="text-gray-600">
            Manage campaigns, sequences, and attribution across all channels
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.totalCampaigns}</div>
                  <p className="text-xs text-muted-foreground">
                    {currentStats.activeCampaigns} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${currentStats.totalSpend.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${currentStats.totalRevenue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentStats.roas}x ROAS
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contacts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {currentStats.totalContacts.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total in CRM
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Channel Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span>Google Ads</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">$8,420</div>
                      <div className="text-xs text-gray-500">28.5 ROAS</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-blue-700" />
                      <span>LinkedIn Ads</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">$4,200</div>
                      <div className="text-xs text-gray-500">15.2 ROAS</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-green-500" />
                      <span>Email Marketing</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">$1,800</div>
                      <div className="text-xs text-gray-500">45.1 ROAS</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-purple-500" />
                      <span>SMS Marketing</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">$1,000</div>
                      <div className="text-xs text-gray-500">52.3 ROAS</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Messaging Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span>Emails Sent</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{currentStats.emailsSent.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">This month</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                      <span>SMS Sent</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{currentStats.smsSent.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">This month</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-blue-700" />
                      <span>LinkedIn Messages</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{currentStats.linkedinMessagesSent}</div>
                      <div className="text-xs text-gray-500">This month</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span>Active Sequences</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{currentStats.activeSequences}</div>
                      <div className="text-xs text-gray-500">Running now</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => setActiveTab('campaigns')}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-sm">New Campaign</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => setActiveTab('messaging')}
                  >
                    <Mail className="h-5 w-5" />
                    <span className="text-sm">Email Sequence</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => setActiveTab('audiences')}
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-sm">Create Audience</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                    onClick={() => setActiveTab('attribution')}
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-sm">View Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Tabs */}
          <TabsContent value="campaigns">
            <CampaignsTab />
          </TabsContent>

          <TabsContent value="audiences">
            <AudiencesTab />
          </TabsContent>

          <TabsContent value="messaging">
            <MessagingTab />
          </TabsContent>

          <TabsContent value="attribution">
            <AttributionTab />
          </TabsContent>

          <TabsContent value="o365">
            <O365Tab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}