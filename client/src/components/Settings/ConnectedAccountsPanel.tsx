import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LinkIcon, UnlinkIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ConnectedAccount {
  provider: string;
  connected: boolean;
  connectedAt?: string;
  email?: string;
}

const PROVIDERS = [
  { id: "microsoft", name: "Microsoft Office 365", icon: "🏢" },
  { id: "google", name: "Google Workspace", icon: "🔍" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
];

export default function ConnectedAccountsPanel() {
  const queryClient = useQueryClient();

  // Fetch connected accounts status
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["connected-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/settings/connected-accounts");
      if (!response.ok) {
        throw new Error("Failed to fetch connected accounts");
      }
      return response.json() as Record<string, ConnectedAccount>;
    },
  });

  // Connect account mutation
  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch(`/api/settings/connect/${provider}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to connect ${provider}`);
      }
      return response.json();
    },
    onSuccess: (data, provider) => {
      if (data.redirectUrl) {
        // Redirect to OAuth flow
        window.location.href = data.redirectUrl;
      } else {
        // Refresh accounts data
        queryClient.invalidateQueries({ queryKey: ["connected-accounts"] });
      }
    },
  });

  // Disconnect account mutation
  const disconnectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch(`/api/settings/disconnect/${provider}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to disconnect ${provider}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected-accounts"] });
    },
  });

  const handleConnect = (provider: string) => {
    connectMutation.mutate(provider);
  };

  const handleDisconnect = (provider: string) => {
    if (confirm(`Are you sure you want to disconnect ${provider}?`)) {
      disconnectMutation.mutate(provider);
    }
  };

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading accounts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your accounts to enable enhanced features and integrations.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {PROVIDERS.map((provider) => {
          const account = accounts?.[provider.id];
          const isConnected = account?.connected || false;
          const isConnecting =
            connectMutation.isPending &&
            connectMutation.variables === provider.id;
          const isDisconnecting =
            disconnectMutation.isPending &&
            disconnectMutation.variables === provider.id;

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{provider.icon}</div>
                <div>
                  <h3 className="font-medium">{provider.name}</h3>
                  {isConnected && account?.email && (
                    <p className="text-sm text-muted-foreground">
                      {account.email}
                    </p>
                  )}
                  {isConnected && account?.connectedAt && (
                    <p className="text-xs text-muted-foreground">
                      Connected on{" "}
                      {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>

                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(provider.id)}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <UnlinkIcon className="h-4 w-4 mr-1" />
                        Disconnect
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleConnect(provider.id)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Connect
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
