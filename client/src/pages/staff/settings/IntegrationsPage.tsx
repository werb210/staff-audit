/**
 * Connected Accounts & OAuth Integrations Page
 * Manages Microsoft 365, Google, LinkedIn authentication with comprehensive OAuth system
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plug, Settings, Zap, CheckCircle, Info } from 'lucide-react';
import ConnectedAccountsTab from '@/components/settings/ConnectedAccountsTab';

export default function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Plug className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Connected Accounts & Integrations</h1>
          <p className="text-gray-600">
            Manage OAuth integrations with external services for enhanced workflow automation
          </p>
        </div>
      </div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="settings">Integration Settings</TabsTrigger>
          <TabsTrigger value="usage">Usage & Logs</TabsTrigger>
        </TabsList>

        {/* Connected Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <ConnectedAccountsTab />
        </TabsContent>

        {/* Integration Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Sync Preferences
                </CardTitle>
                <CardDescription>
                  Configure how often your connected accounts synchronize data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Automatic Sync:</strong> All connected accounts sync automatically every 15 minutes.
                    Manual sync options are available in each service card.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">📅 Calendar Sync</h4>
                    <p className="text-muted-foreground">Every 15 minutes</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">📧 Email Sync</h4>
                    <p className="text-muted-foreground">Every 5 minutes</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">📊 Analytics Sync</h4>
                    <p className="text-muted-foreground">Every 1 hour</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Automation Rules
                </CardTitle>
                <CardDescription>
                  Configure automatic actions based on connected account events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Auto-create tasks from emails</h4>
                      <p className="text-sm text-muted-foreground">Create tasks when important emails are received</p>
                    </div>
                    <div className="text-green-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Sync calendar meetings to contacts</h4>
                      <p className="text-sm text-muted-foreground">Automatically link calendar events to contact records</p>
                    </div>
                    <div className="text-green-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Lead scoring from ad interactions</h4>
                      <p className="text-sm text-muted-foreground">Update lead scores based on advertising engagement</p>
                    </div>
                    <div className="text-green-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage & Logs Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Usage Statistics</CardTitle>
              <CardDescription>
                Monitor API usage and sync activity across your connected accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">142</div>
                  <div className="text-sm text-muted-foreground">API Calls Today</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">98%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">23</div>
                  <div className="text-sm text-muted-foreground">Records Synced</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">3</div>
                  <div className="text-sm text-muted-foreground">Active Connections</div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-3">Recent Sync Activity</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span>Microsoft 365 Calendar - Successful sync</span>
                    <span className="text-muted-foreground">2 minutes ago</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span>Google Analytics - Data refreshed</span>
                    <span className="text-muted-foreground">15 minutes ago</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span>LinkedIn Ads - Campaign data updated</span>
                    <span className="text-muted-foreground">1 hour ago</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}