import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { Badge } from "../../../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { 
  Wand2, 
  Target, 
  DollarSign, 
  BarChart3, 
  Copy,
  RefreshCw,
  Save,
  Play,
  Lightbulb
} from "lucide-react";
import { api } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AIAdCampaign {
  businessType: string;
  targetAudience: string;
  budget: string;
  goals: string;
  location: string;
  additionalInfo: string;
}

interface GeneratedAd {
  headline1: string;
  headline2?: string;
  headline3?: string;
  description1: string;
  description2?: string;
  keywords: string[];
  adExtensions: {
    sitelinks: string[];
    callouts: string[];
  };
}

export default function AIAdBuilder() {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<AIAdCampaign>({
    businessType: '',
    targetAudience: '',
    budget: '',
    goals: '',
    location: '',
    additionalInfo: ''
  });
  
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(0);

  const generateAds = async () => {
    setLoading(true);
    try {
      const response = await api('/api/marketing/ai/generate-ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaign)
      });

      if (response.ads) {
        setGeneratedAds(response.ads);
      }
    } catch (error) {
      console.error('Failed to generate ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateAd = async (index: number) => {
    setLoading(true);
    try {
      const response = await api('/api/marketing/ai/regenerate-ad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...campaign,
          variationIndex: index,
          previousAds: generatedAds
        })
      });

      if (response.ad) {
        const newAds = [...generatedAds];
        newAds[index] = response.ad;
        setGeneratedAds(newAds);
      }
    } catch (error) {
      console.error('Failed to regenerate ad:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCampaign = async () => {
    if (!generatedAds[selectedVariation]) return;
    
    try {
      await api('/api/marketing/google-ads/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `AI Generated - ${campaign.businessType}`,
          ...campaign,
          adVariation: generatedAds[selectedVariation],
          status: 'draft'
        })
      });
      
      toast({
        title: "Campaign Saved",
        description: "Campaign saved successfully!"
      });
    } catch (error) {
      console.error('Failed to save campaign:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save campaign. Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-blue-600" />
            AI Ad Builder
          </h2>
          <p className="text-gray-600">Let AI create optimized Google Ads campaigns for your business</p>
        </div>
      </div>

      {/* Campaign Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaign Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <Select value={campaign.businessType} onValueChange={(value) => setCampaign({...campaign, businessType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="equipment_financing" className="text-gray-900 hover:bg-gray-100">Equipment Financing</SelectItem>
                  <SelectItem value="working_capital" className="text-gray-900 hover:bg-gray-100">Working Capital</SelectItem>
                  <SelectItem value="business_loans" className="text-gray-900 hover:bg-gray-100">Business Loans</SelectItem>
                  <SelectItem value="merchant_cash_advance" className="text-gray-900 hover:bg-gray-100">Merchant Cash Advance</SelectItem>
                  <SelectItem value="sba_loans" className="text-gray-900 hover:bg-gray-100">SBA Loans</SelectItem>
                  <SelectItem value="real_estate_financing" className="text-gray-900 hover:bg-gray-100">Real Estate Financing</SelectItem>
                  <SelectItem value="invoice_factoring" className="text-gray-900 hover:bg-gray-100">Invoice Factoring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <Input
                value={campaign.targetAudience}
                onChange={(e) => setCampaign({...campaign, targetAudience: e.target.value})}
                placeholder="e.g. Small business owners, contractors, restaurants"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Budget ($)
              </label>
              <Input
                type="number"
                value={campaign.budget}
                onChange={(e) => setCampaign({...campaign, budget: e.target.value})}
                placeholder="e.g. 5000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Goal
              </label>
              <Select value={campaign.goals} onValueChange={(value) => setCampaign({...campaign, goals: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign goal" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="lead_generation" className="text-gray-900 hover:bg-gray-100">Generate Leads</SelectItem>
                  <SelectItem value="brand_awareness" className="text-gray-900 hover:bg-gray-100">Brand Awareness</SelectItem>
                  <SelectItem value="website_traffic" className="text-gray-900 hover:bg-gray-100">Drive Website Traffic</SelectItem>
                  <SelectItem value="phone_calls" className="text-gray-900 hover:bg-gray-100">Generate Phone Calls</SelectItem>
                  <SelectItem value="applications" className="text-gray-900 hover:bg-gray-100">Loan Applications</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Location
              </label>
              <Input
                value={campaign.location}
                onChange={(e) => setCampaign({...campaign, location: e.target.value})}
                placeholder="e.g. Canada, Ontario, Toronto"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Information
            </label>
            <Textarea
              value={campaign.additionalInfo}
              onChange={(e) => setCampaign({...campaign, additionalInfo: e.target.value})}
              placeholder="Any specific requirements, unique selling points, or constraints..."
              rows={3}
            />
          </div>
          
          <Button 
            onClick={generateAds} 
            disabled={loading || !campaign.businessType || !campaign.targetAudience}
            className="w-full"
            size="lg"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {loading ? 'Generating AI Ads...' : 'Generate AI Ad Campaigns'}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Ads */}
      {generatedAds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              AI Generated Ad Variations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {generatedAds.map((ad, index) => (
              <div key={index} className={`border rounded-lg p-4 ${selectedVariation === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedVariation === index ? "default" : "secondary"}>
                      Variation {index + 1}
                    </Badge>
                    {selectedVariation === index && (
                      <Badge className="bg-green-100 text-green-800">Selected</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVariation(index)}
                      disabled={selectedVariation === index}
                    >
                      Select
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateAd(index)}
                      disabled={loading}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Headlines */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Headlines</h4>
                    <div className="space-y-1">
                      {[ad.headline1, ad.headline2, ad.headline3].filter(Boolean).map((headline, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">H{i+1}</Badge>
                          <span className="flex-1 font-medium text-blue-900">{headline}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(headline!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Descriptions</h4>
                    <div className="space-y-1">
                      {[ad.description1, ad.description2].filter(Boolean).map((description, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">D{i+1}</Badge>
                          <span className="flex-1 text-gray-700">{description}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(description!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {ad.keywords.map((keyword, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Ad Extensions */}
                  {ad.adExtensions && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Sitelinks</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {ad.adExtensions.sitelinks.map((link, i) => (
                            <li key={i}>• {link}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Callouts</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {ad.adExtensions.callouts.map((callout, i) => (
                            <li key={i}>• {callout}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button onClick={saveCampaign} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Save as Draft Campaign
              </Button>
              <Button variant="outline" onClick={generateAds} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate More Variations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            AI Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-medium">Specific Audience:</span> The more specific your target audience, the better AI can tailor ad copy and keywords.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-medium">Budget Guidelines:</span> Higher budgets allow for broader keyword targeting and more aggressive bidding strategies.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-medium">A/B Testing:</span> Use multiple ad variations to test what resonates best with your Canadian audience.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-medium">Local Focus:</span> Include Canadian location terms and currency references for better local relevance.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}