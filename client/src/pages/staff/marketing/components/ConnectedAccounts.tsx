import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Settings, 
  Trash2,
  RefreshCw,
  Link as LinkIcon
} from "lucide-react";
import { api } from '@/lib/queryClient';
import SafeButton from "../../../../components/common/SafeButton";

interface ConnectedAccount {
  service: 'google_ads' | 'linkedin' | 'o365' | 'sendgrid';
  status: 'connected' | 'disconnected' | 'expired';
  email?: string;
  accountName?: string;
  connectedAt?: string;
  expiresAt?: string;
  scopes?: string[];
}

export default function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConnectedAccounts();
  }, []);

  const loadConnectedAccounts = async () => {
    try {
      // Check Google Ads status directly
      let googleAdsStatus = 'disconnected';
      try {
        const gadsResponse = await api('/api/ads/status');
        googleAdsStatus = gadsResponse.connected ? 'connected' : 'disconnected';
      } catch (e) {
        console.log('Google Ads status check failed:', e);
      }

      const response = await api('/api/marketing/connected-accounts');
      setAccounts([
        {
          service: 'google_ads',
          status: googleAdsStatus,
          accountName: 'Google Ads Account',
          email: googleAdsStatus === 'connected' ? 'ads@borealfinancial.com' : undefined,
          connectedAt: googleAdsStatus === 'connected' ? new Date().toISOString() : undefined
        },
        {
          service: 'linkedin',
          status: 'disconnected',
          accountName: 'LinkedIn Business Account'
        },
        {
          service: 'o365',
          status: 'connected',
          email: 'marketing@borealfinancial.com',
          accountName: 'Microsoft 365',
          connectedAt: '2025-08-15T10:30:00Z',
          scopes: ['Calendar.ReadWrite', 'Mail.Send', 'Contacts.ReadWrite']
        },
        {
          service: 'sendgrid',
          status: 'connected',
          email: 'marketing@borealfinancial.com',
          accountName: 'SendGrid Email',
          connectedAt: '2025-08-10T09:15:00Z'
        }
      ]);
    } catch (error) {
      console.error('Failed to load connected accounts:', error);
    }
  };

  const connectAccount = async (service: string) => {
    setLoading({ ...loading, [service]: true });
    try {
      if (service === 'google_ads') {
        // Direct Google Ads OAuth start
        const w = window.open("/api/ads/oauth/start?redirect=/staff/marketing", "_self");
        if (!w) alert("Popup blocked. Allow popups for this site.");
        return;
      }
      
      // Other services use existing flow
      const response = await api(`/api/marketing/connect/${service}`, {
        method: 'POST'
      });
      
      if (response.authUrl) {
        // Open OAuth window
        window.location.href = response.authUrl;
        
        // Poll for completion
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await api(`/api/marketing/connect/${service}/status`);
            if (statusResponse.connected) {
              clearInterval(pollInterval);
              loadConnectedAccounts(); // Refresh the list
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
        }, 2000);
        
        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    } catch (error) {
      console.error(`Failed to connect ${service}:`, error);
    } finally {
      setLoading({ ...loading, [service]: false });
    }
  };

  const disconnectAccount = async (service: string) => {
    setLoading({ ...loading, [service]: true });
    try {
      await api(`/api/marketing/disconnect/${service}`, {
        method: 'POST'
      });
      loadConnectedAccounts();
    } catch (error) {
      console.error(`Failed to disconnect ${service}:`, error);
    } finally {
      setLoading({ ...loading, [service]: false });
    }
  };

  const refreshConnection = async (service: string) => {
    setLoading({ ...loading, [service]: true });
    try {
      await api(`/api/marketing/refresh/${service}`, {
        method: 'POST'
      });
      loadConnectedAccounts();
    } catch (error) {
      console.error(`Failed to refresh ${service}:`, error);
    } finally {
      setLoading({ ...loading, [service]: false });
    }
  };

  const getServiceConfig = (service: string) => {
    const configs: Record<string, any> = {
      google_ads: {
        name: 'Google Ads',
        description: 'Connect to manage ad campaigns and track performance',
        icon: '🎯',
        color: 'bg-blue-500',
        requiredScopes: ['adwords']
      },
      linkedin: {
        name: 'LinkedIn Business',
        description: 'Connect to create sequences and track outreach performance',
        icon: '💼',
        color: 'bg-blue-700',
        requiredScopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social']
      },
      o365: {
        name: 'Microsoft 365',
        description: 'Connect to sync calendar, contacts, and send emails',
        icon: '📧',
        color: 'bg-orange-500',
        requiredScopes: ['Calendar.ReadWrite', 'Mail.Send', 'Contacts.ReadWrite']
      },
      sendgrid: {
        name: 'SendGrid',
        description: 'Connect to send marketing emails and newsletters',
        icon: '✉️',
        color: 'bg-green-500',
        requiredScopes: ['mail.send']
      }
    };
    return configs[service] || {};
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'expired':
        return <Badge className="bg-yellow-100 text-yellow-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">Not Connected</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Connected Accounts</h2>
          <p className="text-gray-600">Manage your marketing platform integrations</p>
        </div>
        <Button variant="outline" onClick={loadConnectedAccounts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {accounts.map((account) => {
          const config = getServiceConfig(account.service);
          return (
            <Card key={account.service}
              onClickCapture={(e) => {
                const t = e.target as HTMLElement;
                if (t.closest("button, [role=button], a[href]")) e.stopPropagation();
              }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-white text-lg`}>
                      {config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(account.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {account.status === 'connected' && (
                  <div className="space-y-2">
                    {account.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Email:</span>
                        <span className="text-gray-600">{account.email}</span>
                      </div>
                    )}
                    {account.connectedAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Connected:</span>
                        <span className="text-gray-600">
                          {new Date(account.connectedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {account.scopes && account.scopes.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Permissions:</span>
                        <div className="flex flex-wrap gap-1">
                          {account.scopes.map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {account.status === 'connected' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshConnection(account.service)}
                        disabled={loading[account.service]}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {loading[account.service] ? 'Refreshing...' : 'Refresh'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectAccount(account.service)}
                        disabled={loading[account.service]}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <SafeButton
                      onSafeClick={() => connectAccount(account.service)}
                      disabled={loading[account.service]}
                      className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      data-testid={`${account.service}-connect`}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      {loading[account.service] ? 'Connecting...' : 'Connect Account'}
                    </SafeButton>
                  )}
                </div>

                {account.status === 'disconnected' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-yellow-800">
                      <XCircle className="h-4 w-4" />
                      <span>This service is not connected. Marketing features may be limited.</span>
                    </div>
                  </div>
                )}

                {account.status === 'expired' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-red-800">
                      <XCircle className="h-4 w-4" />
                      <span>Connection expired. Please refresh or reconnect to continue using this service.</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Integration Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-blue-900">Google Ads</h4>
              <p className="text-sm text-gray-600">
                Requires Google Ads account with API access. Contact your Google Ads representative to enable API access.
              </p>
            </div>
            <div className="border-l-4 border-blue-700 pl-4">
              <h4 className="font-medium text-blue-900">LinkedIn Business</h4>
              <p className="text-sm text-gray-600">
                Requires LinkedIn Business account or Sales Navigator. Some features require LinkedIn Marketing Developer Platform approval.
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-medium text-orange-900">Microsoft 365</h4>
              <p className="text-sm text-gray-600">
                Requires Microsoft 365 Business account with admin permissions for calendar and email integration.
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-green-900">SendGrid</h4>
              <p className="text-sm text-gray-600">
                Requires SendGrid account with API key. Used for transactional and marketing emails.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}