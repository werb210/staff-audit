import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Webhook, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  const { data: apiKeysData, isLoading: loadingKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => fetch('/api/security/api-keys').then(r => r.json())
  });

  const { data: webhooksData, isLoading: loadingWebhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => fetch('/api/security/webhooks').then(r => r.json())
  });

  const apiKeys = apiKeysData?.keys || [];
  const webhooks = webhooksData?.hooks || [];

  const createKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/security/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to create API key');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'API Key Created',
        description: `New key: ${data.token}`,
      });
    }
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await fetch(`/api/security/api-keys/${keyId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete API key');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'API Key Deleted',
        description: 'API key revoked successfully'
      });
    }
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch('/api/security/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!response.ok) throw new Error('Failed to create webhook');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setNewWebhookUrl('');
      toast({
        title: 'Webhook Created',
        description: 'Webhook endpoint added successfully!'
      });
    }
  });

  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;
    createWebhookMutation.mutate(newWebhookUrl);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Security Settings</h1>
        </div>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </CardTitle>
          <Button
            onClick={() => createKeyMutation.mutate()}
            disabled={createKeyMutation.isPending}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Key
          </Button>
        </CardHeader>
        <CardContent>
          {loadingKeys ? (
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : apiKeys.length > 0 ? (
            <div className="space-y-3">
              {apiKeys.map((key: any) => (
                <div key={key.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-mono text-sm">•••{key.id.slice(-8)}</div>
                    <div className="text-xs text-muted-foreground">
                      Created: {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteKeyMutation.mutate(key.id)}
                    disabled={deleteKeyMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No API keys found. Create your first API key above.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhook Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateWebhook} className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <Input
                type="url"
                placeholder="https://example.com/webhook"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={createWebhookMutation.isPending}>
              {createWebhookMutation.isPending ? 'Adding...' : 'Add Webhook'}
            </Button>
          </form>

          {loadingWebhooks ? (
            <div className="animate-pulse space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : webhooks.length > 0 ? (
            <div className="space-y-3">
              {webhooks.map((webhook: any) => (
                <div key={webhook.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-mono text-sm">{webhook.url}</div>
                      <div className="text-xs text-muted-foreground">
                        Status: <Badge variant="outline">Active</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Test
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No webhook endpoints configured. Add one above to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}