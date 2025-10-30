/**
 * Document AI Features - Features 5 & 6
 * AI document matching and multi-document summarizer
 */

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileSearch,
  FileText,
  Loader,
  CheckCircle,
  XCircle,
  AlertCircle,
  Brain,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DocumentAIFeaturesProps {
  applicationId: string;
}

export function DocumentAIFeatures({ applicationId }: DocumentAIFeaturesProps) {
  const [activeTab, setActiveTab] = useState("matching");

  // Document matching mutation
  const documentMatchingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ai/match-docs", {
        method: "POST",
        body: JSON.stringify({ applicationId }),
      });
      return response;
    },
  });

  // Document summary mutation
  const documentSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ai/summarize-docs", {
        method: "POST",
        body: JSON.stringify({ applicationId }),
      });
      return response;
    },
  });

  const handleMatchDocuments = () => {
    documentMatchingMutation.mutate();
  };

  const handleSummarizeDocuments = () => {
    documentSummaryMutation.mutate();
  };

  const getMatchStatusIcon = (status: string) => {
    switch (status) {
      case "Complete":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Partial":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "Missing":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileSearch className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case "Complete":
        return "bg-green-100 text-green-700";
      case "Partial":
        return "bg-yellow-100 text-yellow-700";
      case "Missing":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matching" className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            AI Document Matching
            <Badge variant="outline" className="text-xs">
              Feature 5
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Document Summarizer
            <Badge variant="outline" className="text-xs">
              Feature 6
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Document Matching Tab */}
        <TabsContent value="matching" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5 text-blue-600" />
                  AI-Powered Document Matching
                </CardTitle>
                <Button
                  onClick={handleMatchDocuments}
                  disabled={documentMatchingMutation.isPending}
                >
                  {documentMatchingMutation.isPending ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Match Documents
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!documentMatchingMutation.data &&
                !documentMatchingMutation.isPending && (
                  <Alert>
                    <AlertDescription>
                      Click "Match Documents" to have AI analyze uploaded
                      documents and match them to standard lending requirements.
                    </AlertDescription>
                  </Alert>
                )}

              {documentMatchingMutation.data?.success && (
                <div className="space-y-4">
                  {documentMatchingMutation.data.analysis?.matches && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Document Matching Results</h4>
                      {documentMatchingMutation.data.analysis.matches.map(
                        (match: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div className="flex items-center gap-3">
                              {getMatchStatusIcon(match.status)}
                              <div>
                                <div className="font-medium">
                                  {match.requirement}
                                </div>
                                {match.matchedDocuments?.length > 0 && (
                                  <div className="text-sm text-gray-600">
                                    Matched: {match.matchedDocuments.join(", ")}
                                  </div>
                                )}
                                {match.notes && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {match.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge
                              className={getMatchStatusColor(match.status)}
                            >
                              {match.status}
                            </Badge>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {documentMatchingMutation.data.analysis?.missingRequirements
                    ?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700">
                        Missing Requirements
                      </h4>
                      <ul className="space-y-1">
                        {documentMatchingMutation.data.analysis.missingRequirements.map(
                          (req: string, index: number) => (
                            <li
                              key={index}
                              className="text-sm text-red-600 flex items-center gap-2"
                            >
                              <XCircle className="h-3 w-3" />
                              {req}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  {documentMatchingMutation.data.analysis?.unmatchedDocuments
                    ?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-700">
                        Unmatched Documents
                      </h4>
                      <ul className="space-y-1">
                        {documentMatchingMutation.data.analysis.unmatchedDocuments.map(
                          (doc: string, index: number) => (
                            <li
                              key={index}
                              className="text-sm text-yellow-600 flex items-center gap-2"
                            >
                              <AlertCircle className="h-3 w-3" />
                              {doc}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {documentMatchingMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to analyze document matching:{" "}
                    {documentMatchingMutation.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Multi-Document Summarizer
                </CardTitle>
                <Button
                  onClick={handleSummarizeDocuments}
                  disabled={documentSummaryMutation.isPending}
                  variant="outline"
                >
                  {documentSummaryMutation.isPending ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Summarize All Docs
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!documentSummaryMutation.data &&
                !documentSummaryMutation.isPending && (
                  <Alert>
                    <AlertDescription>
                      Generate a comprehensive AI summary of all uploaded
                      documents including key financial information, business
                      details, and compliance notes.
                    </AlertDescription>
                  </Alert>
                )}

              {documentSummaryMutation.data?.success && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded border">
                    <h4 className="font-medium mb-3">Document Summary</h4>
                    <div className="whitespace-pre-wrap text-sm">
                      {documentSummaryMutation.data.summary}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Summary generated from all uploaded documents •
                    {new Date().toLocaleString()}
                  </div>
                </div>
              )}

              {documentSummaryMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to generate document summary:{" "}
                    {documentSummaryMutation.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
