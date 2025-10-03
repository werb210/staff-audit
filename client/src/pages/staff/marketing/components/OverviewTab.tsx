import { useEffect, useState } from 'react';
import { api } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';

interface MarketingMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalSpend: number;
  platformBreakdown: {
    linkedin: { campaigns: number; spend: number; conversions: number; };
    twitter: { campaigns: number; spend: number; conversions: number; };
    googleAds: { campaigns: number; spend: number; conversions: number; };
  };
}

export default function OverviewTab() {
  const [metrics, setMetrics] = useState<MarketingMetrics>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalSpend: 0,
    platformBreakdown: {
      linkedin: { campaigns: 0, spend: 0, conversions: 0 },
      twitter: { campaigns: 0, spend: 0, conversions: 0 },
      googleAds: { campaigns: 0, spend: 0, conversions: 0 }
    }
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await api('/api/marketing/overview');
      setMetrics(response.data || metrics);
    } catch (error) {
      console.error('Failed to load marketing metrics:', error);
    }
  };

  const calculateROI = (conversions: number, spend: number) => {
    if (spend === 0) return 0;
    const revenue = conversions * 1000; // Assuming $1000 average loan value
    return ((revenue - spend) / spend * 100);
  };

  const totalROI = calculateROI(metrics.totalConversions, metrics.totalSpend);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCampaigns}</div>
            <div className="text-sm text-green-600">{metrics.activeCampaigns} active</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalImpressions.toLocaleString()}</div>
            <div className="text-sm text-gray-500">All platforms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.totalConversions}</div>
            <div className="text-sm text-gray-500">Total leads generated</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalROI.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">${metrics.totalSpend.toLocaleString()} spent</div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* LinkedIn */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  🔗
                </div>
                <div>
                  <div className="font-semibold">LinkedIn</div>
                  <div className="text-sm text-gray-500">
                    {metrics.platformBreakdown.linkedin.campaigns} campaigns
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{metrics.platformBreakdown.linkedin.conversions} conversions</div>
                <div className="text-sm text-gray-500">
                  ${metrics.platformBreakdown.linkedin.spend.toLocaleString()} spent
                </div>
              </div>
            </div>

            {/* Twitter */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                  🐦
                </div>
                <div>
                  <div className="font-semibold">Twitter</div>
                  <div className="text-sm text-gray-500">
                    {metrics.platformBreakdown.twitter.campaigns} campaigns
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{metrics.platformBreakdown.twitter.conversions} conversions</div>
                <div className="text-sm text-gray-500">
                  ${metrics.platformBreakdown.twitter.spend.toLocaleString()} spent
                </div>
              </div>
            </div>

            {/* Google Ads */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  🎯
                </div>
                <div>
                  <div className="font-semibold">Google Ads</div>
                  <div className="text-sm text-gray-500">
                    {metrics.platformBreakdown.googleAds.campaigns} campaigns
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{metrics.platformBreakdown.googleAds.conversions} conversions</div>
                <div className="text-sm text-gray-500">
                  ${metrics.platformBreakdown.googleAds.spend.toLocaleString()} spent
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaign Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>LinkedIn campaign "Business Loans Q1" launched</span>
              </div>
              <span className="text-gray-500">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Google Ads campaign reached 10,000 impressions</span>
              </div>
              <span className="text-gray-500">6 hours ago</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Twitter campaign paused for budget review</span>
              </div>
              <span className="text-gray-500">1 day ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}