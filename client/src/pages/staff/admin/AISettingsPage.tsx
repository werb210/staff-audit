import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Zap, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Edit,
  Save
} from 'lucide-react';

interface FeatureFlag {
  flag_key: string;
  enabled: boolean;
  config: any;
  updated_at: string;
}

interface AIPrompt {
  id: string;
  prompt_key: string;
  version: number;
  body: string;
  metadata: any;
  active: boolean;
}

interface AIMetrics {
  totalRequests: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
  topActions: Array<{ action: string; count: number; cost: number }>;
}

export default function AISettingsPage() {
  const queryClient = useQueryClient();
  const [editingPrompt, setEditingPrompt] = React.useState<string | null>(null);

  // Feature flags query
  const { data: featureFlags = [], isLoading: loadingFlags } = useQuery({
    queryKey: ['ai-feature-flags'],
    queryFn: () => api('/api/admin/ai/flags'),
  });

  // AI prompts query
  const { data: prompts = [], isLoading: loadingPrompts } = useQuery({
    queryKey: ['ai-prompts'],
    queryFn: () => api('/api/admin/ai/prompts'),
  });

  // AI metrics query
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['ai-metrics'],
    queryFn: () => api('/api/admin/ai/metrics?days=7'),
  });

  // Toggle feature flag mutation
  const toggleFlag = useMutation({
    mutationFn: ({ flagKey, enabled }: { flagKey: string; enabled: boolean }) =>
      api(`/api/admin/ai/flags/${flagKey}`, {
        method: 'PUT',
        body: { enabled }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-feature-flags'] });
    },
  });

  // Update prompt mutation
  const updatePrompt = useMutation({
    mutationFn: ({ promptKey, body }: { promptKey: string; body: string }) =>
      api(`/api/admin/ai/prompts/${promptKey}`, {
        method: 'PUT',
        body: { body }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-prompts'] });
      setEditingPrompt(null);
    },
  });

  const handleToggleFlag = (flag: FeatureFlag) => {
    toggleFlag.mutate({ 
      flagKey: flag.flag_key, 
      enabled: !flag.enabled 
    });
  };

  const handleSavePrompt = (promptKey: string, body: string) => {
    updatePrompt.mutate({ promptKey, body });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">AI Settings & Control</h1>
      </div>

      <Tabs defaultValue="flags" className="space-y-6">
        <TabsList>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="prompts">Prompts & Templates</TabsTrigger>
          <TabsTrigger value="metrics">Metrics & Usage</TabsTrigger>
          <TabsTrigger value="controls">Cost Controls</TabsTrigger>
        </TabsList>

        {/* Feature Flags Tab */}
        <TabsContent value="flags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Feature Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFlags ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading feature flags...
                </div>
              ) : (
                <div className="space-y-4">
                  {featureFlags.map((flag: FeatureFlag) => (
                    <div key={flag.flag_key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{flag.flag_key}</span>
                          <Badge variant={flag.enabled ? "default" : "secondary"}>
                            {flag.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Last updated: {new Date(flag.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={() => handleToggleFlag(flag)}
                        disabled={toggleFlag.isPending}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                AI Prompts & Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPrompts ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading prompts...
                </div>
              ) : (
                <div className="space-y-4">
                  {prompts.map((prompt: AIPrompt) => (
                    <div key={prompt.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{prompt.prompt_key}</span>
                          <Badge variant="outline">v{prompt.version}</Badge>
                          {prompt.active && <Badge variant="default">Active</Badge>}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPrompt(prompt.prompt_key)}
                          disabled={editingPrompt === prompt.prompt_key}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      
                      {editingPrompt === prompt.prompt_key ? (
                        <EditPromptForm
                          prompt={prompt}
                          onSave={(body) => handleSavePrompt(prompt.prompt_key, body)}
                          onCancel={() => setEditingPrompt(null)}
                          isLoading={updatePrompt.isPending}
                        />
                      ) : (
                        <div className="text-sm bg-gray-50 p-3 rounded">
                          {prompt.body}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Total Requests</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {metrics?.totalRequests || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Total Cost</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  ${(metrics?.totalCost || 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Avg Latency</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {Math.round(metrics?.avgLatency || 0)}ms
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Success Rate</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {Math.round((metrics?.successRate || 0) * 100)}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top AI Actions (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.topActions?.map((action: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">{action.action}</span>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{action.count} requests</span>
                      <span>${action.cost.toFixed(2)}</span>
                    </div>
                  </div>
                )) || <div className="text-gray-500">No data available</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Controls Tab */}
        <TabsContent value="controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cost Controls & Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Budget Alert</span>
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    Current monthly spending: ${(metrics?.totalCost * 4 || 0).toFixed(2)} / $500.00 budget
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monthly Budget ($)</label>
                    <Input type="number" defaultValue="500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Warning Threshold (%)</label>
                    <Input type="number" defaultValue="80" />
                  </div>
                </div>
                
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Save Budget Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditPromptForm({ 
  prompt, 
  onSave, 
  onCancel, 
  isLoading 
}: { 
  prompt: AIPrompt; 
  onSave: (body: string) => void; 
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [body, setBody] = React.useState(prompt.body);

  return (
    <div className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={() => onSave(body)}
          disabled={isLoading || body === prompt.body}
        >
          <Save className="w-3 h-3 mr-1" />
          Save Changes
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}