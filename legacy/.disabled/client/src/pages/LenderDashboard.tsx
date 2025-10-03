import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Edit, Plus, DollarSign, Percent, Calendar, Building } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  interest_rate: z.number().min(0).max(100),
  category: z.string().min(1, 'Category is required'),
  min_amount: z.number().min(0),
  max_amount: z.number().min(1000),
  term_months: z.number().min(1).max(360),
  industry_focus: z.string().optional()
});

type ProductFormData = z.infer<typeof productSchema>;

interface LenderProduct {
  id: string;
  name: string;
  interest_rate: number;
  category: string;
  min_amount: number;
  max_amount: number;
  term_months: number;
  industry_focus: string;
  created_at: string;
  updated_at: string;
}

export default function LenderDashboard() {
  const [editingProduct, setEditingProduct] = useState<LenderProduct | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch lender products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['/api/lender-products'],
    queryFn: () => apiRequest('/api/lender-products')
  });

  // Product form
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      interest_rate: 0,
      category: '',
      min_amount: 0,
      max_amount: 0,
      term_months: 0,
      industry_focus: ''
    }
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: ProductFormData) => apiRequest('/api/lender-products', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lender-products'] });
      setIsCreateDialogOpen(false);
      form.reset();
    }
  });

  // Update product mutation  
  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ProductFormData }) => 
      apiRequest(`/api/lender-products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lender-products'] });
      setEditingProduct(null);
      form.reset();
    }
  });

  const handleEditProduct = (product: LenderProduct) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      interest_rate: product.interest_rate,
      category: product.category,
      min_amount: product.min_amount,
      max_amount: product.max_amount,
      term_months: product.term_months,
      industry_focus: product.industry_focus
    });
  };

  const handleSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, updates: data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const products = productsData?.data?.products || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lender Portal</h1>
            <p className="text-gray-600 mt-2">
              Manage your lending products and terms
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
                <DialogDescription>
                  Add a new lending product to your portfolio
                </DialogDescription>
              </DialogHeader>
              <ProductForm
                form={form}
                onSubmit={handleSubmit}
                isLoading={createProductMutation.isPending}
                isEditing={false}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Interest Rate</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.length > 0
                  ? `${(products.reduce((sum: number, p: LenderProduct) => sum + p.interest_rate, 0) / products.length).toFixed(1)}%`
                  : '0%'
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Loan Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.length > 0
                  ? formatCurrency(Math.max(...products.map((p: LenderProduct) => p.max_amount)))
                  : formatCurrency(0)
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Term</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.length > 0
                  ? `${Math.round(products.reduce((sum: number, p: LenderProduct) => sum + p.term_months, 0) / products.length)} mo`
                  : '0 mo'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Lending Products</CardTitle>
            <CardDescription>
              Manage interest rates, terms, and lending criteria for your products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Building className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No products yet</h3>
                <p className="mt-1 text-gray-500">Get started by creating your first lending product.</p>
                <Button
                  className="mt-6"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Product
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Interest Rate</TableHead>
                    <TableHead>Loan Range</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Industry Focus</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product: LenderProduct) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                      <TableCell>{product.interest_rate}%</TableCell>
                      <TableCell>
                        {formatCurrency(product.min_amount)} - {formatCurrency(product.max_amount)}
                      </TableCell>
                      <TableCell>{product.term_months} months</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.industry_focus}</Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Product</DialogTitle>
                              <DialogDescription>
                                Update lending terms for {product.name}
                              </DialogDescription>
                            </DialogHeader>
                            <ProductForm
                              form={form}
                              onSubmit={handleSubmit}
                              isLoading={updateProductMutation.isPending}
                              isEditing={true}
                            />
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductForm({
  form,
  onSubmit,
  isLoading,
  isEditing
}: {
  form: any;
  onSubmit: (data: ProductFormData) => void;
  isLoading: boolean;
  isEditing: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Name
        </label>
        <Input 
          placeholder="Business Term Loan" 
          {...register("name")}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (%)
          </label>
          <Input
            type="number"
            step="0.1"
            placeholder="8.5"
            {...register("interest_rate", { valueAsNumber: true })}
          />
          {errors.interest_rate && (
            <p className="text-red-500 text-sm mt-1">{errors.interest_rate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <Select 
            onValueChange={(value) => setValue("category", value)}
            value={watch("category")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="term-loan">Term Loan</SelectItem>
              <SelectItem value="line-of-credit">Line of Credit</SelectItem>
              <SelectItem value="equipment-financing">Equipment Financing</SelectItem>
              <SelectItem value="working-capital">Working Capital</SelectItem>
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Amount ($)
          </label>
          <Input
            type="number"
            placeholder="10000"
            {...register("min_amount", { valueAsNumber: true })}
          />
          {errors.min_amount && (
            <p className="text-red-500 text-sm mt-1">{errors.min_amount.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Amount ($)
          </label>
          <Input
            type="number"
            placeholder="500000"
            {...register("max_amount", { valueAsNumber: true })}
          />
          {errors.max_amount && (
            <p className="text-red-500 text-sm mt-1">{errors.max_amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Term (Months)
          </label>
          <Input
            type="number"
            placeholder="24"
            {...register("term_months", { valueAsNumber: true })}
          />
          {errors.term_months && (
            <p className="text-red-500 text-sm mt-1">{errors.term_months.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industry Focus
          </label>
          <Input 
            placeholder="Technology, Manufacturing..." 
            {...register("industry_focus")}
          />
          {errors.industry_focus && (
            <p className="text-red-500 text-sm mt-1">{errors.industry_focus.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : isEditing ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}