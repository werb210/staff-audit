import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Clean Lender form schema
const lenderFormSchema = z.object({
  name: z.string().min(1, "Lender name is required"),
  address: z.string().optional(),
  mainPhone: z.string().optional(),
  mainContactFirst: z.string().optional(),
  mainContactLast: z.string().optional(),
  mainContactMobile: z.string().optional(),
  mainContactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  url: z.string().url("Invalid URL").optional().or(z.literal("")),
  description: z.string().optional()
});

type LenderFormData = z.infer<typeof lenderFormSchema>;

interface LenderFormProps {
  initialData?: Partial<LenderFormData>;
  onSubmit: (data: LenderFormData) => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit' | 'view';
}

export default function LenderForm({ 
  initialData, 
  onSubmit, 
  isLoading = false,
  mode = 'create'
}: LenderFormProps) {
  const form = useForm<LenderFormData>({
    resolver: zodResolver(lenderFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      mainPhone: initialData?.mainPhone || '',
      mainContactFirst: initialData?.mainContactFirst || '',
      mainContactLast: initialData?.mainContactLast || '',
      mainContactMobile: initialData?.mainContactMobile || '',
      mainContactEmail: initialData?.mainContactEmail || '',
      url: initialData?.url || '',
      description: initialData?.description || ''
    }
  });

  const isReadOnly = mode === 'view';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lender Name *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="e.g., Accord Financial Corp."
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="https://example.com"
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
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Full business address"
                  disabled={isReadOnly}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="mainPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Main Phone</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="+1 (555) 123-4567"
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mainContactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Main Contact Email</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="email"
                    placeholder="contact@lender.com"
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
            name="mainContactFirst"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact First Name</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="John"
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mainContactLast"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Last Name</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="Smith"
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mainContactMobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Mobile</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="+1 (555) 987-6543"
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Brief description of the lender and their services"
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
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create Lender' : 'Update Lender'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}