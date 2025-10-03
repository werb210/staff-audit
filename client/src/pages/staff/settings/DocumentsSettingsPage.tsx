import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FileText, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DocumentsSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['document-categories'],
    queryFn: () => fetch('/api/documents/categories').then(r => r.json())
  });

  const categories = categoriesData?.categories || [];

  const updateMutation = useMutation({
    mutationFn: async (categories: any[]) => {
      const response = await fetch('/api/documents/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories })
      });
      if (!response.ok) throw new Error('Failed to update categories');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-categories'] });
      toast({
        title: 'Categories Updated',
        description: 'Document categories saved successfully!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update categories',
        variant: 'destructive'
      });
    }
  });

  const handleToggleRequired = (categoryId: string) => {
    const updatedCategories = categories.map((cat: any) =>
      cat.id === categoryId ? { ...cat, required: !cat.required } : cat
    );
    updateMutation.mutate(updatedCategories);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Document Categories</h1>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-40"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : categories.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.map((category: any) => (
                  <div key={category.id} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{category.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {category.required ? 'Required for all applications' : 'Optional document'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant={category.required ? 'default' : 'secondary'}>
                        {category.required ? 'Required' : 'Optional'}
                      </Badge>
                      <Switch
                        checked={category.required}
                        onCheckedChange={() => handleToggleRequired(category.id)}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Document Categories</h3>
              <p className="text-gray-500">Add document categories to organize requirements.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}