import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function TwilioSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    accountSid: '',
    appSid: '',
    outboundCallerId: ''
  });

  const { data: twilioConfig, isLoading } = useQuery({
    queryKey: ['twilio-config'],
    queryFn: () => fetch('/api/twilio/config').then(r => r.json())
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof config) => {
      const response = await fetch('/api/twilio/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-config'] });
      toast({
        title: 'Configuration Saved',
        description: 'Twilio settings updated successfully!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save configuration',
        variant: 'destructive'
      });
    }
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/twilio/token');
      if (!response.ok) throw new Error('Failed to test token');
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Twilio token test result:', data);
      toast({
        title: 'Token Test Successful',
        description: 'Twilio connection is working properly!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Token Test Failed',
        description: error.message || 'Failed to test Twilio connection',
        variant: 'destructive'
      });
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(config);
  };

  const handleTest = () => {
    testMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Twilio Settings</h1>
        </div>
        <Badge variant={twilioConfig?.configured ? 'default' : 'secondary'}>
          {twilioConfig?.configured ? 'Configured' : 'Not Configured'}
        </Badge>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Twilio Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="accountSid" className="block text-sm font-medium mb-2">
                Account SID
              </label>
              <Input
                id="accountSid"
                type="text"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={config.accountSid}
                onChange={(e) => setConfig(prev => ({ ...prev, accountSid: e.target.value }))}
              />
            </div>
            
            <div>
              <label htmlFor="appSid" className="block text-sm font-medium mb-2">
                TwiML App SID
              </label>
              <Input
                id="appSid"
                type="text"
                placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={config.appSid}
                onChange={(e) => setConfig(prev => ({ ...prev, appSid: e.target.value }))}
              />
            </div>
            
            <div>
              <label htmlFor="outboundCallerId" className="block text-sm font-medium mb-2">
                Outbound Caller ID
              </label>
              <Input
                id="outboundCallerId"
                type="tel"
                placeholder="+1234567890"
                value={config.outboundCallerId}
                onChange={(e) => setConfig(prev => ({ ...prev, outboundCallerId: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {twilioConfig?.configured ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm">
                {twilioConfig?.configured ? 'Connected to Twilio' : 'Not connected to Twilio'}
              </span>
            </div>
            
            {twilioConfig?.lastTested && (
              <div className="text-sm text-muted-foreground">
                Last tested: {new Date(twilioConfig.lastTested).toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}