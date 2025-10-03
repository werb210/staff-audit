import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { api } from '@/lib/queryClient';

// Product form schema matching the clean schema
const productFormSchema = z.object({
  lenderId: z.string().uuid("Please select a lender"),
  productName: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  minAmount: z.number().min(1, "Minimum amount must be greater than 0"),
  maxAmount: z.number().min(1, "Maximum amount must be greater than 0"),
  minTermMonths: z.number().optional(),
  maxTermMonths: z.number().optional(),
  minInterest: z.number().optional(),
  maxInterest: z.number().optional(),
  minCreditScore: z.number().optional(),
  minAnnualRevenue: z.number().optional(),
  minTimeBusinessMonths: z.number().optional(),
  preferredIndustries: z.string().optional(),
  excludedIndustries: z.string().optional(),
  country: z.string().optional(),
  requiredDocuments: z.string().optional()
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit' | 'view';
}

const categoryOptions = [
  'line_of_credit',
  'term_loan',
  'equipment_financing',
  'invoice_factoring',
  'purchase_order_financing',
  'Working Capital',
  'Asset-Based Lending',
  'SBA Loan'
];

export default function ProductForm({ 
  initialData, 
  onSubmit, 
  isLoading = false,
  mode = 'create'
}: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      lenderId: initialData?.lenderId || '',
      productName: initialData?.productName || '',
      category: initialData?.category || '',
      minAmount: initialData?.minAmount || 0,
      maxAmount: initialData?.maxAmount || 0,
      minTermMonths: initialData?.minTermMonths || undefined,
      maxTermMonths: initialData?.maxTermMonths || undefined,
      minInterest: initialData?.minInterest || undefined,
      maxInterest: initialData?.maxInterest || undefined,
      minCreditScore: initialData?.minCreditScore || undefined,
      minAnnualRevenue: initialData?.minAnnualRevenue || undefined,
      minTimeBusinessMonths: initialData?.minTimeBusinessMonths || undefined,
      preferredIndustries: initialData?.preferredIndustries || '',
      excludedIndustries: initialData?.excludedIndustries || '',
      country: initialData?.country || '',
      requiredDocuments: initialData?.requiredDocuments || ''
    }
  });

  // Fetch lenders for dropdown
  const { data: lenders = [] } = useQuery({
    queryKey: ['lenders'],
    queryFn: async () => {
      const response = await api('/api/lenders');
      return response || [];
    },
  });

  const isReadOnly = mode === 'view';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="lenderId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lender *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lenders.map((lender: any) => (
                      <SelectItem key={lender.id} value={lender.id}>
                        {lender.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="e.g., Business Line of Credit"
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="US, CA"
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Amount *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Amount *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minTermMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Term (Months)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxTermMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Term (Months)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minInterest"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Interest Rate (%)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number"
                    step="0.01"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxInterest"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Interest Rate (%)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number"
                    step="0.01"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="minCreditScore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Credit Score</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minAnnualRevenue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Annual Revenue</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minTimeBusinessMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Time in Business (Months)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="preferredIndustries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Industries</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Manufacturing, Healthcare, Technology (comma-separated)"
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="excludedIndustries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Excluded Industries</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Cannabis, Adult Entertainment (comma-separated)"
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="requiredDocuments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Required Documents</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Bank statements, Tax returns, Financial statements (comma-separated)"
                  disabled={isReadOnly}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isReadOnly && (
          <div className="flex justify-end space-x-2">
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Update Product'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}