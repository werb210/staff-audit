/**
 * Smart Next Step Engine - Feature 4
 * AI-powered next step suggestions
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader, ArrowRight, RotateCcw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SmartNextStepEngineProps {
  applicationId: string;
}

export function SmartNextStepEngine({ applicationId }: SmartNextStepEngineProps) {
  const { data: nextStepData, isLoading, error, refetch } = useQuery({
    queryKey: ['next-step', applicationId],
    queryFn: async () => {
      const response = await apiRequest('/api/ai/next-step', {
        method: 'POST',
        body: JSON.stringify({ applicationId })
      });
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!applicationId
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '🔥';
      case 'MEDIUM':
        return '⚡';
      case 'LOW':
        return '💡';
      default:
        return '📋';
    }
  };

  if (isLoading) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <div className="flex items-center gap-2">
          <Loader className="h-4 w-4 animate-spin text-blue-600" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-800">AI analyzing next steps...</span>
              <Badge variant="outline" className="text-xs">Feature 4</Badge>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  if (error || !nextStepData?.success) {
    return (
      <Alert variant="destructive">
        <Lightbulb className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Unable to generate next step suggestion</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { suggestion, priority } = nextStepData;

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Lightbulb className="h-4 w-4 text-blue-600" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-800">AI Suggested Next Step</span>
              <Badge variant="outline" className="text-xs">Feature 4</Badge>
              {priority && (
                <Badge className={`${getPriorityColor(priority)} text-xs`}>
                  {getPriorityIcon(priority)} {priority}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex items-start gap-3">
            <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700 leading-relaxed">
              {suggestion}
            </p>
          </div>

          <div className="text-xs text-blue-600 pt-2 border-t border-blue-200">
            AI recommendation based on current application status and document analysis
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}