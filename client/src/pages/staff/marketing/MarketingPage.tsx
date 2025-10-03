import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import GoogleAdsTab from './components/GoogleAdsTab';
import LinkedInTab from './components/LinkedInTab';
import ConnectedAccounts from './components/ConnectedAccounts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Mail, MessageSquare, Search, Settings } from 'lucide-react';
import SiloSwitcher from '@/components/layout/SiloSwitcher';
import { useToast } from '@/hooks/use-toast';
import { useFeaturePanel, FeatureActionButton } from '@/features/featureWiring';

// Email marketing tab component
function EmailTab() {
  const { toast } = useToast();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Campaigns
          </CardTitle>
          <CardDescription>
            SendGrid-powered email marketing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button 
              className="w-fit"
              onClick={() => {
                toast({
                  title: "Create Email Campaign",
                  description: "Email campaign creation with SendGrid integration coming soon"
                });
              }}
            >
              Create New Campaign
            </Button>
            
            {/* Sample Email Campaigns */}
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Equipment Financing Newsletter</h4>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Monthly newsletter featuring equipment financing tips and success stories</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>📧 2,450 sent</span>
                  <span>📊 24.8% open rate</span>
                  <span>🎯 3.2% click rate</span>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Welcome Series</h4>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Automated</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">3-part welcome series for new leads and applications</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>📧 890 sent</span>
                  <span>📊 31.2% open rate</span>
                  <span>🎯 5.8% click rate</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Messaging tab component (LinkedIn sequences)
function MessagingTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            LinkedIn Messaging
          </CardTitle>
          <CardDescription>
            LinkedIn sequences and automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LinkedInTab />
        </CardContent>
      </Card>
    </div>
  );
}

export default function MarketingPage() {
  useFeaturePanel("ads-analytics");
  
  return (
    <div>
      <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Dashboard</h1>
          <p className="text-gray-600">Unified marketing across all channels</p>
        </div>
        <FeatureActionButton 
          featureId="ads-analytics"
          className="border rounded px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => {
            // Refresh ads analytics
            window.location.reload();
          }}
        >
          Refresh Overview
        </FeatureActionButton>
      </div>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="ads" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Ads
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messaging
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts" className="mt-6">
          <ConnectedAccounts />
        </TabsContent>
        
        <TabsContent value="ads" className="mt-6">
          <GoogleAdsTab />
        </TabsContent>
        
        <TabsContent value="messaging" className="mt-6">
          <MessagingTab />
        </TabsContent>
        
        <TabsContent value="email" className="mt-6">
          <EmailTab />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}