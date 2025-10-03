import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface ConnectedAccount {
  connected: boolean;
  connectedAt?: string;
  provider: string;
}

export default function IntegrationsTab() {
  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['connected-accounts'],
    queryFn: async () => {
      const response = await fetch('/api/settings/connected-accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch connected accounts');
      }
      return response.json() as Record<string, ConnectedAccount>;
    }
  });

  const integrations = [
    {
      id: 'microsoft',
      name: 'Microsoft Office 365',
      description: 'Connect to access Outlook emails, Calendar events, and Teams integration',
      icon: '🏢',
      features: ['Email Management', 'Calendar Integration', 'Contact Sync'],
      available: true
    },
    {
      id: 'google',
      name: 'Google Workspace',
      description: 'Integrate with Gmail, Google Calendar, and Google Drive',
      icon: '🔍',
      features: ['Gmail Access', 'Calendar Events', 'Drive Documents'],
      available: true
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Business',
      description: 'Automate LinkedIn outreach and lead generation',
      icon: '💼',
      features: ['Lead Generation', 'Message Automation', 'Profile Analytics'],
      available: true
    }
  ];

  const handleConnect = (provider: string) => {
    const currentUser = localStorage.getItem('currentUserId') || 'current-user';
    window.location.href = `/api/auth/${provider}?userId=${currentUser}`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-3 text-lg">Loading integrations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Integrations</h3>
            <p className="text-muted-foreground">Please try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect external services to enhance your workflow and productivity.
        </p>
      </div>

      <div className="grid gap-6">
        {integrations.map((integration) => {
          const account = accounts?.[integration.id];
          const isConnected = account?.connected || false;

          return (
            <Card key={integration.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{integration.icon}</div>
                    <div>
                      <CardTitle className="text-xl">{integration.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={isConnected ? "default" : "secondary"}
                      className={isConnected ? "bg-green-100 text-green-800" : ""}
                    >
                      {isConnected ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {integration.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {isConnected && account?.connectedAt && (
                    <div className="text-xs text-muted-foreground">
                      Connected on {new Date(account.connectedAt).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      {isConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement disconnect
                            console.log('Disconnect', integration.id);
                          }}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(integration.id)}
                          disabled={!integration.available}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Connect
                        </Button>
                      )}
                    </div>
                    
                    {!integration.available && (
                      <Badge variant="secondary">Coming Soon</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Need Another Integration?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Let us know if you need additional integrations for your workflow.
          </p>
          <Button variant="outline">
            Request Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}