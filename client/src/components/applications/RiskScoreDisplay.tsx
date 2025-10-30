import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Shield,
  Target,
  Brain,
  Loader2,
  RefreshCw,
  Tag,
  FileText,
} from "lucide-react";

interface RiskAssessment {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  recommendations: string[];
  confidence: number;
  tags: string[];
}

interface RiskScoreDisplayProps {
  applicationId: string;
  autoLoad?: boolean;
}

export default function RiskScoreDisplay({
  applicationId,
  autoLoad = false,
}: RiskScoreDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  // Fetch risk assessment
  const {
    data: assessmentData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["risk-assessment", applicationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/ai/applications/${applicationId}/risk-score`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch risk assessment");
      }
      return response.json();
    },
    enabled: autoLoad,
  });

  // Calculate risk score mutation
  const calculateRiskMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/ai/applications/${applicationId}/risk-score`,
      );
      if (!response.ok) {
        throw new Error("Failed to calculate risk score");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["risk-assessment", applicationId],
      });
    },
  });

  // Process application documents mutation
  const processDocumentsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/ai/applications/${applicationId}/process`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to process documents");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["risk-assessment", applicationId],
      });
    },
  });

  const assessment: RiskAssessment = assessmentData?.data;

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-orange-600 bg-orange-100";
      case "critical":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "low":
        return <Shield className="h-4 w-4" />;
      case "medium":
        return <Target className="h-4 w-4" />;
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 30) return "text-green-600";
    if (score <= 50) return "text-yellow-600";
    if (score <= 70) return "text-orange-600";
    return "text-red-600";
  };

  if (!assessment && !isLoading && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <span>AI Risk Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            No risk assessment available for this application.
          </p>
          <div className="flex items-center justify-center space-x-2">
            <Button
              onClick={() => calculateRiskMutation.mutate()}
              disabled={calculateRiskMutation.isPending}
            >
              {calculateRiskMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Calculate Risk Score
            </Button>
            <Button
              variant="outline"
              onClick={() => processDocumentsMutation.mutate()}
              disabled={processDocumentsMutation.isPending}
            >
              {processDocumentsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Process All Documents
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || calculateRiskMutation.isPending) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            Calculating AI risk assessment...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Failed to load risk assessment</p>
          <Button
            variant="outline"
            onClick={() => calculateRiskMutation.mutate()}
            disabled={calculateRiskMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Risk Score Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span>AI Risk Assessment</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {Math.round(assessment.confidence * 100)}% confidence
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => calculateRiskMutation.mutate()}
                disabled={calculateRiskMutation.isPending}
              >
                {calculateRiskMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Risk Score Display */}
          <div className="text-center">
            <div
              className={`text-6xl font-bold ${getScoreColor(assessment.riskScore)} mb-2`}
            >
              {assessment.riskScore}
            </div>
            <Badge
              className={`${getRiskLevelColor(assessment.riskLevel)} mb-4`}
            >
              {getRiskIcon(assessment.riskLevel)}
              <span className="ml-1 capitalize">
                {assessment.riskLevel} Risk
              </span>
            </Badge>
            <Progress
              value={assessment.riskScore}
              className="w-full max-w-md mx-auto"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Risk Score (1-100, higher = more risk)
            </p>
          </div>

          {/* Quick Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Primary Risk Factors
              </p>
              <div className="space-y-1">
                {assessment.riskFactors.slice(0, 2).map((factor, index) => (
                  <div
                    key={index}
                    className="text-sm flex items-start space-x-2"
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>{factor}</span>
                  </div>
                ))}
                {assessment.riskFactors.length > 2 && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    +{assessment.riskFactors.length - 2} more factors
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Key Recommendations
              </p>
              <div className="space-y-1">
                {assessment.recommendations.slice(0, 2).map((rec, index) => (
                  <div
                    key={index}
                    className="text-sm flex items-start space-x-2"
                  >
                    <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
                {assessment.recommendations.length > 2 && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    +{assessment.recommendations.length - 2} more
                    recommendations
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          {assessment.tags && assessment.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {assessment.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Details Button */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Hide Details" : "Show Full Details"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Risk Analysis */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Risk Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* All Risk Factors */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>Risk Factors ({assessment.riskFactors.length})</span>
              </h4>
              <div className="space-y-2">
                {assessment.riskFactors.map((factor, index) => (
                  <div
                    key={index}
                    className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    <p className="text-sm text-orange-800">{factor}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* All Recommendations */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span>
                  Recommendations ({assessment.recommendations.length})
                </span>
              </h4>
              <div className="space-y-2">
                {assessment.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <p className="text-sm text-blue-800">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
