import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Mail, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LendersSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lendersData, isLoading } = useQuery({
    queryKey: ['lenders-config'],
    queryFn: () => fetch('/api/lenders/config').then(r => r.json())
  });

  const lenders = lendersData?.lenders || [];

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/lenders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update lender');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenders-config'] });
      toast({
        title: 'Lender Updated',
        description: 'Lender settings saved successfully!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update lender',
        variant: 'destructive'
      });
    }
  });

  const handleToggleActive = (lender: any) => {
    updateMutation.mutate({
      id: lender.id,
      updates: { active: !lender.active }
    });
  };

  const handleSendMethodChange = (lender: any, sendVia: string) => {
    updateMutation.mutate({
      id: lender.id,
      updates: { sendVia }
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Lenders Configuration</h1>
        </div>
      </div>

      {/* Lenders List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : lenders.length > 0 ? (
          lenders.map((lender: any) => (
            <Card key={lender.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{lender.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {lender.sendVia === 'email' ? (
                            <><Mail className="h-3 w-3" /> {lender.email}</>
                          ) : (
                            <><Globe className="h-3 w-3" /> API Integration</>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge variant={lender.active ? 'default' : 'secondary'}>
                      {lender.active ? 'Active' : 'Disabled'}
                    </Badge>
                    
                    <Select
                      value={lender.sendVia}
                      onValueChange={(value) => handleSendMethodChange(lender, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Switch
                      checked={lender.active}
                      onCheckedChange={() => handleToggleActive(lender)}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Lenders Configured</h3>
              <p className="text-gray-500">Add lenders to start processing applications.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}