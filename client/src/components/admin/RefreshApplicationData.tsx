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
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Database,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface RefreshStats {
  totalApplications: number;
  withDocuments: number;
  readyForLenders: number;
  totalDocuments: number;
}

export default function RefreshApplicationData() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RefreshStats | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const { toast } = useToast();

  const refreshAllApplications = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/applications/refresh-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setLastRefresh(new Date().toLocaleString());

        toast({
          title: "Applications Refreshed",
          description: `Updated ${data.stats.totalApplications} applications with complete field data and document information`,
        });
      } else {
        throw new Error(data.message || "Refresh failed");
      }
    } catch (error) {
      console.error("Error refreshing applications:", error);
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh application data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Application Data Refresh
        </CardTitle>
        <CardDescription>
          Refresh all application cards to populate all available fields and
          ensure documents are visible
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Refresh Button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Refresh All Applications</p>
            <p className="text-sm text-gray-600">
              Updates cards with business details, contact info, and document
              status
            </p>
          </div>
          <Button
            onClick={refreshAllApplications}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh All"}
          </Button>
        </div>

        {/* Last Refresh Info */}
        {lastRefresh && (
          <div className="text-sm text-gray-600 border-t pt-4">
            <p>
              <strong>Last refreshed:</strong> {lastRefresh}
            </p>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Applications:</span>
                <Badge variant="outline">{stats.totalApplications}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">With Documents:</span>
                <Badge
                  variant={stats.withDocuments > 0 ? "default" : "secondary"}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {stats.withDocuments}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ready for Lenders:</span>
                <Badge
                  variant={stats.readyForLenders > 0 ? "default" : "secondary"}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {stats.readyForLenders}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Documents:</span>
                <Badge variant="outline">{stats.totalDocuments}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Card Features Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">
            Enhanced Card Information
          </h4>
          <p className="text-sm text-blue-800 mb-2">
            After refresh, application cards will display:
          </p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • <strong>Business Details:</strong> Industry, type, revenue,
              employees, years in business
            </li>
            <li>
              • <strong>Contact Information:</strong> Email, phone, address,
              website
            </li>
            <li>
              • <strong>Financial Data:</strong> Loan amount, use of funds,
              annual revenue
            </li>
            <li>
              • <strong>Document Status:</strong> Count, verification status,
              missing documents
            </li>
            <li>
              • <strong>Recent Uploads:</strong> Preview of latest documents
              with status indicators
            </li>
          </ul>
        </div>

        {/* Document Display Info */}
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">
            Document Visibility
          </h4>
          <p className="text-sm text-green-800">
            All documents attached to applications in the database will be:
          </p>
          <ul className="text-sm text-green-700 space-y-1 mt-2">
            <li>• ✅ Counted and displayed in card statistics</li>
            <li>
              • ✅ Shown with verification status (verified/pending/rejected)
            </li>
            <li>• ✅ Listed with file names and upload dates</li>
            <li>• ✅ Flagged if required documents are missing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
