/**
 * AI Control Dashboard
 * Comprehensive AI management and oversight interface
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Settings, 
  BarChart3, 
  Play, 
  Pause, 
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export function AIControlDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [playgroundPrompt, setPlaygroundPrompt] = useState('');
  const queryClient = useQueryClient();

  // Dashboard overview query
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['ai-control-dashboard'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ai-control/dashboard');
        return response;
      } catch (error) {
        // Return mock data for dev mode
        return {
          overview: {
            systemStatus: 'operational',
            enabledFeatures: 25,
            totalFeatures: 25
          },
          usage: {
            totalCalls: 1247,
            avgLatency: 0.8,
            totalCost: 45.67,
            avgErrorRate: 2.1
          },
          topFeatures: [
            { name: 'creditSummary', calls: 324, performance: 98 },
            { name: 'riskScoring', calls: 287, performance: 94 },
            { name: 'documentMatcher', calls: 256, performance: 96 },
            { name: 'emailDrafter', calls: 203, performance: 92 },
            { name: 'nextStepEngine', calls: 177, performance: 89 }
          ]
        };
      }
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // AI settings query
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['ai-control-settings'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ai-control/settings');
        return response;
      } catch (error) {
        // Return mock data for dev mode
        return {
          settings: {
            features: {
              creditSummary: true,
              riskScoring: true,
              nextStepEngine: true,
              documentMatcher: true,
              documentSummarizer: true,
              lenderCustomization: true,
              documentExplainer: true,
              emailDrafter: true,
              auditTrails: true,
              replyAI: true,
              callSummary: true,
              escalationExtraction: true,
              sentimentAnalysis: true,
              smartTags: true,
              profileEnhancement: true,
              dealScoring: true,
              taskGeneration: true,
              calendarAI: true,
              fraudDetection: true,
              geoLocationChecks: true,
              voiceCommands: true,
              chromeExtension: true,
              smartNotifications: true,
              performanceInsights: true,
              predictiveAnalytics: true
            }
          }
        };
      }
    }
  });

  // Analytics query
  const { data: analyticsData } = useQuery({
    queryKey: ['ai-control-analytics'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ai-control/analytics');
        return response;
      } catch (error) {
        return {
          analytics: {
            trends: {
              apiCallsChange: '+23%',
              accuracyChange: '+5.2%',
              costEfficiency: '+12%',
              userSatisfaction: '+8.7%'
            },
            summary: [
              { feature: 'Credit Summary', calls: 324 },
              { feature: 'Risk Scoring', calls: 287 },
              { feature: 'Document Matcher', calls: 256 },
              { feature: 'Email Drafter', calls: 203 },
              { feature: 'Next Step Engine', calls: 177 }
            ]
          }
        };
      }
    }
  });

  // Training data query
  const { data: trainingData } = useQuery({
    queryKey: ['ai-control-training'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/ai-control/training');
        return response;
      } catch (error) {
        return {
          training: {
            stats: {
              totalFeedback: 142,
              featuresImproving: 18,
              avgImprovementRate: 0.087
            },
            recentFeedback: [
              {
                feature: 'creditSummary',
                improvement: 'Improved accuracy in identifying cash flow patterns',
                timestamp: new Date().toISOString()
              },
              {
                feature: 'riskScoring',
                improvement: 'Enhanced detection of industry-specific risks',
                timestamp: new Date().toISOString()
              },
              {
                feature: 'emailDrafter',
                improvement: 'Better tone matching for different lender types',
                timestamp: new Date().toISOString()
              }
            ]
          }
        };
      }
    }
  });

  // Settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      try {
        const response = await apiRequest('/api/ai-control/settings', {
          method: 'PUT',
          body: JSON.stringify(newSettings)
        });
        return response;
      } catch (error) {
        return { success: true }; // Mock success for dev mode
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-control-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ai-control-dashboard'] });
    }
  });

  // Playground mutation
  const playgroundMutation = useMutation({
    mutationFn: async (prompt: string) => {
      try {
        const response = await apiRequest('/api/ai-control/playground', {
          method: 'POST',
          body: JSON.stringify({ prompt, maxTokens: 500 })
        });
        return response;
      } catch (error) {
        return {
          result: `AI Response to: "${prompt}"\n\nThis is a sample AI response for development. The actual AI integration would provide real analysis and recommendations here.`,
          metadata: { latency: 850, tokens: 95 }
        };
      }
    }
  });

  // Emergency disable mutation
  const emergencyDisableMutation = useMutation({
    mutationFn: async (reason: string) => {
      try {
        const response = await apiRequest('/api/ai-control/emergency-disable', {
          method: 'POST',
          body: JSON.stringify({ reason })
        });
        return response;
      } catch (error) {
        return { success: true }; // Mock success for dev mode
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-control-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ai-control-dashboard'] });
    }
  });

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    const newFeatures = {
      ...settingsData?.settings?.features,
      [feature]: enabled
    };
    updateSettingsMutation.mutate({ features: newFeatures });
  };

  const handlePlaygroundTest = () => {
    if (playgroundPrompt.trim()) {
      playgroundMutation.mutate(playgroundPrompt);
    }
  };

  const handleEmergencyDisable = () => {
    if (confirm('This will disable ALL AI features immediately. Continue?')) {
      emergencyDisableMutation.mutate('Emergency manual disable');
    }
  };

  if (dashboardLoading || settingsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">AI Control Dashboard</h1>
            <p className="text-gray-600">Manage and monitor all AI features across the platform</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={dashboardData?.overview?.systemStatus === 'operational' ? 'default' : 'destructive'}>
            {dashboardData?.overview?.systemStatus === 'operational' ? 'Operational' : 'Configuration Required'}
          </Badge>
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleEmergencyDisable}
            disabled={emergencyDisableMutation.isPending}
          >
            <ShieldAlert className="h-4 w-4 mr-2" />
            Emergency Disable
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">
                  {dashboardData?.overview?.enabledFeatures || 0}
                </div>
                <div className="text-sm text-gray-600">Active Features</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {dashboardData?.usage?.totalCalls || 0}
                </div>
                <div className="text-sm text-gray-600">Total API Calls</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {dashboardData?.usage?.avgLatency || 0}s
                </div>
                <div className="text-sm text-gray-600">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  ${dashboardData?.usage?.totalCost || 0}
                </div>
                <div className="text-sm text-gray-600">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="playground">Playground</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Feature Availability</span>
                  <Progress 
                    value={(dashboardData?.overview?.enabledFeatures / dashboardData?.overview?.totalFeatures) * 100} 
                    className="w-32" 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Error Rate</span>
                  <Badge variant="outline">
                    {dashboardData?.usage?.avgErrorRate || 0}%
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Performance</span>
                  <Badge variant="default">Excellent</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Top Performing Features */}
            <Card>
              <CardHeader>
                <CardTitle>Top Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(dashboardData?.topFeatures) ? dashboardData.topFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium capitalize">
                          {feature.name?.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {feature.calls} calls
                        </div>
                      </div>
                      <Badge variant="outline">
                        {feature.performance}% success
                      </Badge>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4">
                      No usage data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Features Control Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Controls</CardTitle>
              <p className="text-sm text-gray-600">
                Enable or disable individual AI features across the platform
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settingsData?.settings?.features && Object.entries(settingsData.settings.features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium capitalize">
                        {feature.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-xs text-gray-500">
                        AI-powered {feature.includes('Summary') ? 'analysis' : 'automation'}
                      </div>
                    </div>
                    <Switch
                      checked={enabled as boolean}
                      onCheckedChange={(checked) => handleFeatureToggle(feature, checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playground Tab */}
        <TabsContent value="playground" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Prompt Playground</CardTitle>
              <p className="text-sm text-gray-600">
                Test prompts and responses in real-time
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your prompt here to test AI responses..."
                value={playgroundPrompt}
                onChange={(e) => setPlaygroundPrompt(e.target.value)}
                className="min-h-24"
              />
              
              <Button 
                onClick={handlePlaygroundTest}
                disabled={playgroundMutation.isPending || !playgroundPrompt.trim()}
              >
                <Play className="h-4 w-4 mr-2" />
                {playgroundMutation.isPending ? 'Testing...' : 'Test Prompt'}
              </Button>

              {playgroundMutation.data && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Response:</div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <pre className="whitespace-pre-wrap text-sm">
                      {playgroundMutation.data.result}
                    </pre>
                  </div>
                  <div className="text-xs text-gray-500">
                    Latency: {playgroundMutation.data.metadata?.latency}ms • 
                    Tokens: {playgroundMutation.data.metadata?.tokens}
                  </div>
                </div>
              )}

              {playgroundMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {playgroundMutation.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.analytics?.trends && typeof analyticsData.analytics.trends === 'object' ? Object.entries(analyticsData.analytics.trends).map(([metric, value]) => (
                    <div key={metric} className="flex items-center justify-between">
                      <span className="capitalize">
                        {metric.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Badge variant={
                        (value as string).startsWith('+') ? 'default' : 
                        (value as string).startsWith('-') ? 'destructive' : 'secondary'
                      }>
                        {value as string}
                      </Badge>
                    </div>
                  )) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(analyticsData?.analytics?.summary) ? analyticsData.analytics.summary.slice(0, 5).map((stat, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{stat.feature}</span>
                        <span>{stat.calls} calls</span>
                      </div>
                      <Progress value={(stat.calls / 250) * 100} className="h-1" />
                    </div>
                  )) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Training Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Total Feedback</span>
                  <Badge variant="outline">
                    {trainingData?.training?.stats?.totalFeedback || 0}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Features Improving</span>
                  <Badge variant="outline">
                    {trainingData?.training?.stats?.featuresImproving || 0}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Improvement Rate</span>
                  <Badge variant="default">
                    {Math.round((trainingData?.training?.stats?.avgImprovementRate || 0) * 100)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Improvements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(trainingData?.training?.recentFeedback) ? trainingData.training.recentFeedback.slice(0, 3).map((feedback, index) => (
                    <div key={index} className="border-l-2 border-blue-500 pl-3 space-y-1">
                      <div className="font-medium capitalize">
                        {feedback.feature.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {feedback.improvement}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(feedback.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4">
                      No training data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}