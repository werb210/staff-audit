/**
 * Risk Score Widget - Feature 2
 * AI-powered risk assessment display
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Loader, RotateCcw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useFeaturePanel, FeatureActionButton } from '@/features/featureWiring';

interface RiskScoreWidgetProps {
  applicationId: string;
}

export function RiskScoreWidget({ applicationId }: RiskScoreWidgetProps) {
  useFeaturePanel("credit-summary", { appId: applicationId });
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: riskData, isLoading, error, refetch } = useQuery({
    queryKey: ['risk-score', applicationId, refreshKey],
    queryFn: async () => {
      const response = await apiRequest('/api/ai/risk-score', {
        method: 'POST',
        body: JSON.stringify({ applicationId })
      });
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!applicationId
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW RISK':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'MEDIUM RISK':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'HIGH RISK':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW RISK':
        return '🟢';
      case 'MEDIUM RISK':
        return '🟡';
      case 'HIGH RISK':
        return '🔴';
      default:
        return '⚪';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing risk...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !riskData?.success) {
    return (
      <Card className="w-full border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Risk analysis failed</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { riskLevel, explanation } = riskData;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">AI Risk Assessment</span>
              <Badge variant="outline" className="text-xs">Feature 2</Badge>
            </div>
            <FeatureActionButton 
              featureId="credit-summary"
              className="border rounded px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleRefresh}
            >
              <RotateCcw className="h-3 w-3" />
            </FeatureActionButton>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl">{getRiskIcon(riskLevel)}</span>
            <div className="flex-1">
              <Badge className={`${getRiskColor(riskLevel)} font-medium`}>
                {riskLevel}
              </Badge>
              {explanation && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {explanation}
                </p>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 pt-2 border-t">
            AI-powered risk analysis • Updated {new Date().toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}