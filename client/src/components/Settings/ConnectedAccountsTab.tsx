import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Settings,
  ExternalLink,
  Plug,
  Mail,
  Calendar,
  BarChart3,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConnectedAccount {
  id: string;
  name: string;
  service: string;
  status: "connected" | "disconnected" | "error";
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  lastSync?: string;
  features: string[];
}

const connectedAccounts: ConnectedAccount[] = [
  {
    id: "google-ads",
    name: "Google Ads",
    service: "Google",
    status: "connected",
    description: "Automated campaign management and performance tracking",
    icon: BarChart3,
    lastSync: "2 minutes ago",
    features: [
      "Campaign Management",
      "Conversion Tracking",
      "Performance Analytics",
    ],
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    service: "Microsoft",
    status: "connected",
    description: "Calendar integration and email automation",
    icon: Calendar,
    lastSync: "5 minutes ago",
    features: ["Calendar Sync", "Email Templates", "Contact Management"],
  },
  {
    id: "linkedin",
    name: "LinkedIn Sales Navigator",
    service: "LinkedIn",
    status: "connected",
    description: "Lead generation and prospecting automation",
    icon: Users,
    lastSync: "1 hour ago",
    features: ["Lead Generation", "Message Sequences", "Profile Analytics"],
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    service: "Twilio",
    status: "connected",
    description: "Transactional email delivery and analytics",
    icon: Mail,
    lastSync: "30 minutes ago",
    features: ["Email Delivery", "Template Management", "Analytics"],
  },
];

export default function ConnectedAccountsTab() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState(connectedAccounts);

  const handleConfigure = (accountId: string, accountName: string) => {
    console.log(`🔧 Configure clicked for ${accountName} (ID: ${accountId})`);

    toast({
      title: "Opening Configuration",
      description: `Opening ${accountName} settings panel...`,
      variant: "default",
    });

    // Add specific navigation logic based on account type
    const account = accounts.find((acc) => acc.id === accountId);
    if (account) {
      switch (accountId) {
        case "google-ads":
          console.log("🎯 Navigating to Google Ads settings");
          // Navigate to Google Ads configuration
          window.location.href = "/staff/settings/google-ads";
          break;
        case "microsoft-365":
          console.log("📅 Navigating to Microsoft 365 settings");
          // Navigate to O365 configuration
          break;
        case "linkedin":
          console.log("💼 Navigating to LinkedIn settings");
          // Navigate to LinkedIn configuration
          break;
        case "sendgrid":
          console.log("📧 Navigating to SendGrid settings");
          // Navigate to SendGrid configuration
          break;
        default:
          console.log(`⚙️ Generic configuration for ${accountName}`);
      }
    }
  };

  const handleDisconnect = (accountId: string, accountName: string) => {
    console.log(`🔌 Disconnect clicked for ${accountName} (ID: ${accountId})`);

    toast({
      title: "Account Disconnected",
      description: `${accountName} has been disconnected. You can reconnect anytime.`,
      variant: "destructive",
    });

    // Update account status
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? { ...acc, status: "disconnected" as const, lastSync: undefined }
          : acc,
      ),
    );
  };

  const handleReconnect = (accountId: string, accountName: string) => {
    console.log(`🔄 Reconnect clicked for ${accountName} (ID: ${accountId})`);

    toast({
      title: "Reconnecting Account",
      description: `Initiating OAuth flow for ${accountName}...`,
      variant: "default",
    });

    // Simulate reconnection
    setTimeout(() => {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId
            ? { ...acc, status: "connected" as const, lastSync: "Just now" }
            : acc,
        ),
      );

      toast({
        title: "Account Reconnected",
        description: `${accountName} is now connected and syncing.`,
        variant: "default",
      });
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Connected
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Connected Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your OAuth integrations and external service connections
          </p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Plug className="h-4 w-4" />
          Add Integration
        </Button>
      </div>

      <div className="grid gap-4">
        {accounts.map((account) => {
          const IconComponent = account.icon;

          return (
            <Card key={account.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {account.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {account.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(account.status)}
                    {getStatusBadge(account.status)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Features List */}
                  <div>
                    <p className="text-sm font-medium mb-2">Features</p>
                    <div className="flex flex-wrap gap-1">
                      {account.features.map((feature, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Last Sync Info */}
                  {account.lastSync && (
                    <div className="text-xs text-muted-foreground">
                      Last sync: {account.lastSync}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {account.status === "connected" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleConfigure(account.id, account.name)
                          }
                          className="flex items-center gap-1"
                        >
                          <Settings className="h-3 w-3" />
                          Configure
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleDisconnect(account.id, account.name)
                          }
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleReconnect(account.id, account.name)
                        }
                        className="flex items-center gap-1"
                      >
                        <Plug className="h-3 w-3" />
                        Reconnect
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Docs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
