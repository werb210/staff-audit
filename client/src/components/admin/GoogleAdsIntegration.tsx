import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ExternalLink,
  Shield,
  CheckCircle,
  AlertCircle,
  Settings,
} from "lucide-react";

interface GoogleAdsStatus {
  linked: boolean;
  loginCustomerId?: string;
  hasDevToken: boolean;
  killSwitch: boolean;
  sandboxMode: boolean;
}

export default function GoogleAdsIntegration() {
  const [status, setStatus] = useState<GoogleAdsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUrl, setAuthUrl] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/google/ads/auth/status", {});
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error checking Google Ads status:", error);
      toast({
        title: "Error",
        description: "Failed to check Google Ads integration status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch("/api/google/ads/auth/url", {});
      const data = await response.json();
      if (data.url) {
        window.open(data.url, "_blank", "width=600,height=600");
        // Poll for connection status after opening auth window
        const pollInterval = setInterval(() => {
          checkStatus().then(() => {
            if (status?.linked) {
              clearInterval(pollInterval);
              toast({
                title: "Success",
                description: "Google Ads account successfully connected!",
              });
            }
          });
        }, 2000);

        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    } catch (error) {
      console.error("Error getting auth URL:", error);
      toast({
        title: "Error",
        description: "Failed to generate authorization URL",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch("/api/google/ads/accounts", {});
      const data = await response.json();

      if (data.error) {
        toast({
          title: "Connection Test Failed",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Test Successful",
          description: `Found ${data.resourceNames?.length || 0} accessible accounts`,
        });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      toast({
        title: "Connection Test Failed",
        description: "Failed to test Google Ads API connection",
        variant: "destructive",
      });
    }
  };

  const createConversions = async () => {
    try {
      const response = await fetch("/api/google/ads/conversion-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.error) {
        toast({
          title: "Conversion Creation Failed",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conversion Actions Created",
          description:
            "Lead, Qualified, and Funded conversion actions have been created",
        });
        console.log("Conversion actions created:", data);
      }
    } catch (error) {
      console.error("Error creating conversions:", error);
      toast({
        title: "Error",
        description: "Failed to create conversion actions",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Ads Integration</CardTitle>
          <CardDescription>Loading integration status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Google Ads Integration
        </CardTitle>
        <CardDescription>
          Connect your Google Ads account to track commission-based conversions
          and optimize for ROAS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Connection Status:</span>
            {status?.linked ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>

          {!status?.linked && (
            <Button onClick={handleConnect} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Connect Google Ads
            </Button>
          )}
        </div>

        {/* Configuration Details */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <span className="text-sm font-medium text-gray-600">
              Customer ID:
            </span>
            <p className="text-sm">{status?.loginCustomerId || "Not set"}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">
              Developer Token:
            </span>
            <p className="text-sm">
              {status?.hasDevToken ? "✓ Configured" : "✗ Missing"}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">
              Kill Switch:
            </span>
            <Badge variant={status?.killSwitch ? "destructive" : "default"}>
              {status?.killSwitch ? "Enabled (Safe)" : "Disabled"}
            </Badge>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">
              Sandbox Mode:
            </span>
            <Badge variant={status?.sandboxMode ? "secondary" : "default"}>
              {status?.sandboxMode ? "Enabled (Testing)" : "Production"}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        {status?.linked && (
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={testConnection}>
              Test Connection
            </Button>
            <Button
              variant="outline"
              onClick={createConversions}
              disabled={status?.killSwitch}
            >
              Create Conversion Actions
            </Button>
            <Button variant="outline" onClick={checkStatus}>
              Refresh Status
            </Button>
          </div>
        )}

        {/* Safety Notice */}
        {status?.killSwitch && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Safety Mode Active</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Kill switch is enabled. No ads will spend until this is disabled
              in environment settings.
            </p>
          </div>
        )}

        {/* Conversion Tracking Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">
            Value-Based Tracking
          </h4>
          <p className="text-sm text-blue-800">
            This integration tracks <strong>commission values</strong> instead
            of cheap leads:
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            <li>
              • <strong>Lead Submitted</strong> - Initial application conversion
            </li>
            <li>
              • <strong>Qualified Lead</strong> - Pre-qualified for lending
            </li>
            <li>
              • <strong>Deal Funded</strong> - Commission earned (ROAS
              optimization)
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
