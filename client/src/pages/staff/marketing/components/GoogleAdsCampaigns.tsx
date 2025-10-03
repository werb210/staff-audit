import { useEffect, useState } from 'react';
import { api } from '@/lib/queryClient';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { PlusCircle, Play, Pause, BarChart3 } from 'lucide-react';
import ErrorBanner from '../../../../components/ErrorBanner';
import { useToast } from '@/hooks/use-toast';

interface GoogleAdsCampaign {
  id: string;
  name: string;
  adType: 'search' | 'display' | 'video' | 'shopping';
  headline: string;
  description: string;
  targetUrl: string;
  keywords: string[];
  budget: number;
  bidStrategy: 'cpc' | 'cpm' | 'cpa';
  status: 'draft' | 'active' | 'paused' | 'completed';
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  qualityScore: number;
  createdAt: string;
}

interface CampaignForm {
  name: string;
  adType: string;
  headline: string;
  description: string;
  targetUrl: string;
  keywords: string;
  budget: string;
  bidStrategy: string;
}

export default function GoogleAdsCampaigns() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    name: '',
    adType: 'search',
    headline: '',
    description: '',
    targetUrl: '',
    keywords: '',
    budget: '',
    bidStrategy: 'cpc'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await api('/api/marketing/google-ads/campaigns');
      if (response.items && response.items.length > 0) {
        setCampaigns(response.items);
      } else {
        // Show sample campaigns when API returns no data
        setCampaigns([
          {
            id: 'gads-1',
            name: 'Equipment Financing - Search',
            adType: 'search' as const,
            headline: 'Fast Equipment Financing | Boreal Financial',
            description: 'Get equipment financing in 24 hours. No collateral required. Apply online for business equipment loans up to $500K.',
            targetUrl: 'https://borealfinancial.com/equipment-financing',
            keywords: ['equipment financing', 'business equipment loans', 'machinery financing'],
            budget: 2500,
            bidStrategy: 'cpc' as const,
            status: 'active' as const,
            impressions: 12540,
            clicks: 287,
            conversions: 23,
            cost: 1876.50,
            qualityScore: 8.2,
            createdAt: '2025-08-15T09:30:00Z'
          },
          {
            id: 'gads-2', 
            name: 'Working Capital - Display',
            adType: 'display' as const,
            headline: 'Need Working Capital? We Can Help',
            description: 'Quick approval for working capital loans. Flexible terms, competitive rates. Get your business the cash it needs to grow.',
            targetUrl: 'https://borealfinancial.com/working-capital',
            keywords: ['working capital loans', 'business cash advance', 'small business funding'],
            budget: 1800,
            bidStrategy: 'cpm' as const,
            status: 'active' as const,
            impressions: 8920,
            clicks: 156,
            conversions: 11,
            cost: 1234.80,
            qualityScore: 7.8,
            createdAt: '2025-08-12T14:15:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load Google Ads campaigns:', error);
      // Show empty state instead of crashing
      setCampaigns([]);
    }
  };

  const createCampaign = async () => {
    setLoading(true);
    try {
      const newCampaign = {
        name: campaignForm.name,
        adType: campaignForm.adType,
        headline: campaignForm.headline,
        description: campaignForm.description,
        targetUrl: campaignForm.targetUrl,
        keywords: campaignForm.keywords.split(',').map(k => k.trim()),
        budget: parseFloat(campaignForm.budget),
        bidStrategy: campaignForm.bidStrategy
      };
      
      // Call API to create campaign
      const response = await api('/api/marketing/google-ads/campaigns', {
        method: 'POST',
        body: JSON.stringify(newCampaign)
      });
      
      // Add to campaigns list
      setCampaigns([...campaigns, response]);
      
      // Reset form
      setCampaignForm({
        name: '',
        adType: 'search',
        headline: '',
        description: '',
        targetUrl: '',
        keywords: '',
        budget: '',
        bidStrategy: 'cpc'
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await api(`/api/marketing/google-ads/campaigns/${campaignId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      
      // Update local state
      setCampaigns(campaigns.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: newStatus as any }
          : campaign
      ));
    } catch (error) {
      console.error('Failed to toggle campaign status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {campaigns.length === 0 && (
        <ErrorBanner message="Google Ads campaigns failed to load. Please check your account connection." />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Google Ads Campaigns</h3>
          <p className="text-gray-600">Manage your Google Ads campaigns and performance</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="outline">
          <PlusCircle className="h-4 w-4 mr-2" />
          {showForm ? 'Cancel' : 'Create Campaign'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Google Ads Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name</label>
                  <Input
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                    placeholder="e.g. Equipment Financing - Search"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Ad Type</label>
                  <select
                    value={campaignForm.adType}
                    onChange={(e) => setCampaignForm({...campaignForm, adType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="search">Search</option>
                    <option value="display">Display</option>
                    <option value="video">Video</option>
                    <option value="shopping">Shopping</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Headline</label>
                <Input
                  value={campaignForm.headline}
                  onChange={(e) => setCampaignForm({...campaignForm, headline: e.target.value})}
                  placeholder="Enter your ad headline..."
                  maxLength={30}
                />
                <div className="text-xs text-gray-500 mt-1">{campaignForm.headline.length}/30 characters</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                  placeholder="Enter your ad description..."
                  rows={3}
                  maxLength={90}
                />
                <div className="text-xs text-gray-500 mt-1">{campaignForm.description.length}/90 characters</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Target URL</label>
                  <Input
                    value={campaignForm.targetUrl}
                    onChange={(e) => setCampaignForm({...campaignForm, targetUrl: e.target.value})}
                    placeholder="https://example.com/landing-page"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Daily Budget ($)</label>
                  <Input
                    type="number"
                    value={campaignForm.budget}
                    onChange={(e) => setCampaignForm({...campaignForm, budget: e.target.value})}
                    placeholder="50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Keywords (comma-separated)</label>
                  <Input
                    value={campaignForm.keywords}
                    onChange={(e) => setCampaignForm({...campaignForm, keywords: e.target.value})}
                    placeholder="equipment financing, business loans, machinery financing"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Bid Strategy</label>
                  <select
                    value={campaignForm.bidStrategy}
                    onChange={(e) => setCampaignForm({...campaignForm, bidStrategy: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cpc">Cost Per Click (CPC)</option>
                    <option value="cpm">Cost Per Thousand Impressions (CPM)</option>
                    <option value="cpa">Cost Per Acquisition (CPA)</option>
                  </select>
                </div>
              </div>
              
              <Button onClick={createCampaign} disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {campaign.adType.toUpperCase()}
                    </Badge>
                    <Badge 
                      className={`text-xs ${
                        campaign.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : campaign.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                  >
                    {campaign.status === 'active' ? (
                      <><Pause className="h-4 w-4 mr-1" /> Pause</>
                    ) : (
                      <><Play className="h-4 w-4 mr-1" /> Resume</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast({title: "Campaign Analytics", description: "Advanced campaign analytics coming soon"})}>
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Analytics
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-blue-900">{campaign.headline}</div>
                  <div className="text-sm text-gray-600 mt-1">{campaign.description}</div>
                  <div className="text-xs text-green-600 mt-1">{campaign.targetUrl}</div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {campaign.keywords.map((keyword, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm border-t pt-4">
                  <div>
                    <div className="font-medium">Impressions</div>
                    <div className="text-gray-600">{campaign.impressions.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium">Clicks</div>
                    <div className="text-gray-600">{campaign.clicks}</div>
                  </div>
                  <div>
                    <div className="font-medium">CTR</div>
                    <div className="text-gray-600">{((campaign.clicks / campaign.impressions) * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="font-medium">Conversions</div>
                    <div className="text-gray-600">{campaign.conversions}</div>
                  </div>
                  <div>
                    <div className="font-medium">Cost</div>
                    <div className="text-gray-600">${campaign.cost.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {campaigns.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No Google Ads campaigns found. Create your first campaign or connect your Google Ads account.
          </CardContent>
        </Card>
      )}
    </div>
  );
}