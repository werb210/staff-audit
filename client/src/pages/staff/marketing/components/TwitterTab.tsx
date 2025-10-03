import { useEffect, useState } from 'react';
import { api } from '@/lib/queryClient';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';

interface TwitterCampaign {
  id: string;
  name: string;
  content: string;
  hashtags: string[];
  targetUrl?: string;
  budget: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  impressions: number;
  clicks: number;
  retweets: number;
  likes: number;
  conversions: number;
  cost: number;
  createdAt: string;
}

interface CampaignForm {
  name: string;
  content: string;
  hashtags: string;
  targetUrl: string;
  budget: string;
}

export default function TwitterTab() {
  const [campaigns, setCampaigns] = useState<TwitterCampaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    name: '',
    content: '',
    hashtags: '',
    targetUrl: '',
    budget: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await api('/api/marketing/twitter/campaigns');
      setCampaigns(response.items || []);
    } catch (error) {
      console.error('Failed to load Twitter campaigns:', error);
    }
  };

  const saveCampaign = async () => {
    if (!campaignForm.name || !campaignForm.content) return;
    
    setLoading(true);
    try {
      await api('/api/marketing/twitter/campaigns', {
        method: 'POST',
        body: {
          ...campaignForm,
          hashtags: campaignForm.hashtags.split(',').map(tag => tag.trim()).filter(Boolean),
          budget: parseFloat(campaignForm.budget) || 0
        }
      });
      
      resetForm();
      await loadCampaigns();
    } catch (error) {
      console.error('Failed to create Twitter campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      await api(`/api/marketing/twitter/campaigns/${campaignId}/status`, {
        method: 'PATCH',
        body: { status }
      });
      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, status: status as any } : c
      ));
    } catch (error) {
      console.error('Failed to update campaign status:', error);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this Twitter campaign?')) return;
    
    try {
      await api(`/api/marketing/twitter/campaigns/${campaignId}`, { method: 'DELETE' });
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const resetForm = () => {
    setCampaignForm({
      name: '',
      content: '',
      hashtags: '',
      targetUrl: '',
      budget: ''
    });
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const calculateEngagementRate = (likes: number, retweets: number, impressions: number) => {
    return impressions > 0 ? (((likes + retweets) / impressions) * 100).toFixed(2) : '0.00';
  };

  const getCharacterCount = (text: string) => {
    return text.length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            🐦 Twitter Campaigns
          </h2>
          <p className="text-gray-600">Reach your audience through social media advertising</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-sky-500 hover:bg-sky-600">
          + Create Twitter Campaign
        </Button>
      </div>

      {/* Twitter-specific tips */}
      <Card className="bg-sky-50 border-sky-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="text-sky-600 text-lg">💡</div>
            <div>
              <h3 className="font-semibold text-sky-800">Twitter Best Practices</h3>
              <ul className="text-sm text-sky-700 mt-1 space-y-1">
                <li>• Keep tweets concise and engaging (280 character limit)</li>
                <li>• Use relevant hashtags like #SmallBusiness #BusinessLoans #Entrepreneur</li>
                <li>• Include compelling visuals or videos when possible</li>
                <li>• Post during peak engagement hours (9 AM - 10 AM, 7 PM - 9 PM)</li>
                <li>• Engage with your audience through replies and retweets</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">🐦</div>
              <div className="text-gray-500">No Twitter campaigns created yet</div>
              <div className="text-sm text-gray-400">Create your first campaign to reach social media audiences</div>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {campaign.name}
                      <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </CardTitle>
                    <p className="text-gray-600 mt-1">{campaign.content}</p>
                    {campaign.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {campaign.hashtags.map((tag, index) => (
                          <span key={index} className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {campaign.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, 'active')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Launch
                      </Button>
                    )}
                    {campaign.status === 'active' && (
                      <Button
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Pause
                      </Button>
                    )}
                    {campaign.status === 'paused' && (
                      <Button
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, 'active')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Resume
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCampaign(campaign.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Impressions</div>
                    <div className="font-semibold">{campaign.impressions.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Likes</div>
                    <div className="font-semibold text-red-600">{campaign.likes.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Retweets</div>
                    <div className="font-semibold text-green-600">{campaign.retweets.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Engagement</div>
                    <div className="font-semibold">{calculateEngagementRate(campaign.likes, campaign.retweets, campaign.impressions)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Conversions</div>
                    <div className="font-semibold text-green-600">{campaign.conversions}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Spend</div>
                    <div className="font-semibold">${campaign.cost.toLocaleString()}</div>
                  </div>
                </div>
                {campaign.targetUrl && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-gray-500">Target URL:</div>
                    <a href={campaign.targetUrl} target="_blank" rel="noopener noreferrer" 
                       className="text-sky-600 hover:underline text-sm">
                      {campaign.targetUrl}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Campaign Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Twitter Campaign</h3>
              <Button variant="outline" size="sm" onClick={resetForm}>✕</Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Campaign Name *</label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="e.g., Small Business Loans Twitter Q1"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Tweet Content *</label>
                <div className="relative">
                  <Textarea
                    value={campaignForm.content}
                    onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
                    placeholder="Write your tweet here. Keep it engaging and under 280 characters..."
                    className="mt-1 min-h-[100px]"
                    maxLength={280}
                  />
                  <div className={`absolute bottom-2 right-2 text-xs ${
                    getCharacterCount(campaignForm.content) > 260 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {getCharacterCount(campaignForm.content)}/280
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Hashtags</label>
                <Input
                  value={campaignForm.hashtags}
                  onChange={(e) => setCampaignForm({ ...campaignForm, hashtags: e.target.value })}
                  placeholder="SmallBusiness, BusinessLoans, Entrepreneur (comma separated)"
                  className="mt-1"
                />
                <div className="text-xs text-gray-500 mt-1">Separate multiple hashtags with commas</div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Landing Page URL</label>
                <Input
                  type="url"
                  value={campaignForm.targetUrl}
                  onChange={(e) => setCampaignForm({ ...campaignForm, targetUrl: e.target.value })}
                  placeholder="https://example.com/business-loans"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Budget ($)</label>
                <Input
                  type="number"
                  value={campaignForm.budget}
                  onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                  placeholder="500"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button
                onClick={saveCampaign}
                disabled={loading || !campaignForm.name || !campaignForm.content}
                className="bg-sky-500 hover:bg-sky-600"
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}