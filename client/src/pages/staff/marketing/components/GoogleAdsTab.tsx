import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { useToast } from '../../../../hooks/use-toast';
import { 
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, MousePointer, 
  Eye, Users, Zap, Search, Image, Target, Settings, Copy, ExternalLink,
  ChevronUp, ChevronDown, Clock, Brain, BarChart3, PieChart, Lightbulb, Wand2
} from 'lucide-react';
import AIAdBuilder from './AIAdBuilder';
import GoogleAdsCampaigns from './GoogleAdsCampaigns';
import AdsCopilotDrawer from '../../../../components/marketing/AdsCopilotDrawer';

interface GoogleAdsData {
  connected: boolean;
  kpis?: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    cost: number;
    cpa: number;
    roas: number;
    revenue: number;
  };
  anomalies?: Array<{
    kind: string;
    msg: string;
    severity: 'high' | 'med' | 'low';
  }>;
  topMovers?: any[];
  underperf?: any[];
  campaigns?: any[];
  setupUrl?: string;
}

export default function GoogleAdsTab() {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [siloFilter, setSiloFilter] = useState<'all' | 'bf' | 'slf'>('all');
  const { toast } = useToast();

  // Fetch Google Ads overview data from new analytics API
  const { data: adsData, isLoading: adsLoading, error: adsError } = useQuery<GoogleAdsData>({
    queryKey: ['google-ads-overview', selectedCustomerId],
    queryFn: async () => {
      const response = await fetch(`/api/ads-analytics/overview?customerId=${selectedCustomerId}&range=last_7_days`);
      if (!response.ok) throw new Error('Failed to fetch ads data');
      return response.json();
    }
  });

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // AI Copilot actions
  const handleAIAction = async (action: string, data?: any) => {
    try {
      let endpoint = '';
      let payload = {};

      switch (action) {
        case 'explain':
          endpoint = '/api/google-ads/ai/explain';
          payload = { entity: 'campaign', change: data };
          break;
        case 'rebalance':
          endpoint = '/api/google-ads/ai/rebalance';
          payload = { targetSpend: adsData?.performance?.spend * 1.1 };
          break;
        case 'copy':
          endpoint = '/api/google-ads/ai/copy';
          payload = { product: 'Business Financing', lpUrl: 'https://boreal.financial' };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      toast({
        title: `AI ${action} completed`,
        description: `Generated ${action} suggestions successfully`
      });
    } catch (error) {
      toast({
        title: `AI ${action} failed`,
        description: 'Please try again later',
        variant: 'destructive'
      });
    }
  };

  if (!adsData?.connected) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Connect Google Ads</h3>
        <p className="text-gray-600 mb-6">
          Connect your Google Ads account to access AI-powered campaign insights and optimization.
        </p>
        <Button size="lg" onClick={() => window.open(adsData?.setupUrl, '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Connect Google Ads Account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with AI Copilot Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Silo Filter */}
          <div className="flex items-center space-x-2">
            <Button
              variant={siloFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSiloFilter('all')}
            >
              All
            </Button>
            <Button
              variant={siloFilter === 'bf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSiloFilter('bf')}
            >
              BF
            </Button>
            <Button
              variant={siloFilter === 'slf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSiloFilter('slf')}
            >
              SLF
            </Button>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowAICopilot(!showAICopilot)}
          className="border-blue-200 bg-blue-50"
        >
          <Brain className="w-4 h-4 mr-2" />
          AI Copilot
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Performance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(adsData?.kpis?.cost || 0)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12.5% vs last 7 days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adsData?.kpis?.conversions || 0}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8.2% vs last 7 days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPA</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(adsData?.kpis?.cpa || 0)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  -5.1% vs last 7 days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROAS</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adsData?.kpis?.roas?.toFixed(1) || '0.0'}x</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +15.3% vs last 7 days
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Health & Anomalies Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Account Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Disapproved Ads</span>
                  <Badge variant={adsData?.health?.disapprovedAds ? 'destructive' : 'secondary'}>
                    {adsData?.health?.disapprovedAds || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Budget Limited</span>
                  <Badge variant={adsData?.health?.limitedBudget ? 'outline' : 'secondary'}>
                    {adsData?.health?.limitedBudget || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Learning</span>
                  <Badge variant="secondary">
                    {adsData?.health?.learningCampaigns || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {adsData?.anomalies?.length ? (
                  <div className="space-y-2">
                    {adsData.anomalies.map((anomaly, i) => (
                      <div key={i} className="text-sm">
                        <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'outline'} className="mr-2">
                          {anomaly.kind}
                        </Badge>
                        {anomaly.msg}
                        <Button size="sm" variant="ghost" className="ml-2" onClick={() => setShowAICopilot(true)}>
                          Explain
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No anomalies detected</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Budget Optimizer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {adsData?.budgetSuggestions?.length ? (
                  <div className="space-y-2">
                    {adsData.budgetSuggestions.map((suggestion, i) => (
                      <div key={i} className="text-sm">
                        <p className="font-medium">{formatCurrency(suggestion.amount)} rebalance</p>
                        <p className="text-gray-600">{suggestion.reason}</p>
                        <Button size="sm" variant="outline" className="mt-1">
                          Apply Draft
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">No budget optimizations available</p>
                    <Button size="sm" variant="outline" onClick={() => handleAIAction('rebalance')}>
                      <Brain className="w-3 h-3 mr-1" />
                      AI Rebalance
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Deep-dive Tabs */}
          <Tabs defaultValue="ai-builder" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="ai-builder" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                AI Builder
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="search-terms" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Terms
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Assets
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ai-builder" className="mt-6">
              <AIAdBuilder />
            </TabsContent>
            
            <TabsContent value="campaigns" className="mt-6">
              <GoogleAdsCampaigns />
            </TabsContent>
            
            <TabsContent value="search-terms" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Terms Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-500 py-4">Search terms clustering and negative keyword suggestions</p>
                  <div className="flex justify-center space-x-2">
                    <Button variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      AI Cluster Terms
                    </Button>
                    <Button variant="outline">
                      Smart Negatives
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="assets" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Max Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-500 py-4">Asset gap detection and performance optimization</p>
                  <div className="flex justify-center">
                    <Button variant="outline">
                      <Image className="w-4 h-4 mr-2" />
                      Asset Gap Fixer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-6">
              <div className="text-center text-gray-500 py-8">
                Google Ads account settings and configuration coming soon.
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </div>

      {/* AI Copilot Drawer */}
      <AdsCopilotDrawer 
        open={showAICopilot} 
        onClose={() => setShowAICopilot(false)} 
        context={{
          kpis: adsData?.kpis,
          anomalies: adsData?.anomalies,
          topMovers: adsData?.topMovers,
          underperf: adsData?.underperf,
          campaigns: adsData?.campaigns,
          assets: []
        }} 
      />
    </div>
  );
}