// Dev auto-patch: disable SW when VITE_DISABLE_SW=1
if ((import.meta as any).env?.VITE_DISABLE_SW==='1') { console.info('SW disabled for dev'); /* early return */ }

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const ProductFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  country: z.enum(["CA","US"], { required_error: "Country is required" }),
  category: z.string().min(2, "Category is required"),
  min_amount: z.preprocess(v => v === "" || v === null ? null : Number(v), z.number().nullable().optional()),
  max_amount: z.preprocess(v => v === "" || v === null ? null : Number(v), z.number().nullable().optional()),
  active: z.boolean().default(true),
  min_time_in_business: z.preprocess(v => v === "" || v === null ? null : Number(v), z.number().int().nullable().optional()),
  min_monthly_revenue: z.preprocess(v => v === "" || v === null ? null : Number(v), z.number().nullable().optional()),
  required_documents: z.preprocess(v => {
    if (typeof v === "string") return v.split(",").map(s => s.trim()).filter(Boolean);
    return Array.isArray(v) ? v : [];
  }, z.array(z.string()).default([])),
  excluded_industries: z.preprocess(v => {
    if (typeof v === "string") return v.split(",").map(s => s.trim()).filter(Boolean);
    return Array.isArray(v) ? v : [];
  }, z.array(z.string()).default([])),
}).refine(v => {
  if (v.min_amount != null && v.max_amount != null) return v.min_amount <= v.max_amount;
  return true;
}, { message: "Min amount must be <= max amount", path: ["min_amount"] });

type FormData = z.infer<typeof ProductFormSchema>;

interface LenderProductFormProps {
  id?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LenderProductForm({ id, onSuccess, onCancel }: LenderProductFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(!!id);
  const [submitting, setSubmitting] = React.useState(false);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: { 
      active: true, 
      required_documents: [], 
      excluded_industries: [],
      country: "US"
    }
  });

  const countryValue = watch("country");

  React.useEffect(() => {
    if (!id) return;
    
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/v1/products/${id}`);
        if (!response.ok) throw new Error("Failed to load product");
        
        const product = await response.json();
        setValue("id", product.id);
        setValue("name", product.productName || "");
        setValue("country", product.countryOffered || "US");
        setValue("category", product.productCategory || "");
        setValue("min_amount", product.minimumLendingAmount);
        setValue("max_amount", product.maximumLendingAmount);
        setValue("active", product.isActive ?? true);
        setValue("min_time_in_business", product.min_time_in_business);
        setValue("min_monthly_revenue", product.min_monthly_revenue);
        setValue("required_documents", product.required_documents || []);
        setValue("excluded_industries", product.excluded_industries || []);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load product:", error);
        toast({
          title: "Error",
          description: "Failed to load product data",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, setValue, toast]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/v1/products/${id}` : "/api/v1/products";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || "Failed to save product");
      }

      toast({
        title: "Success",
        description: `Product ${id ? "updated" : "created"} successfully`,
      });

      onSuccess?.();
    } catch (error) {
      console.error("Failed to save product:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save product",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading product data...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
      <div className="grid gap-4">
        <div>
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country">Country *</Label>
            <Select
              value={countryValue}
              onValueChange={(value) => setValue("country", value as "CA" | "US")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CA">Canada (CA)</SelectItem>
                <SelectItem value="US">United States (US)</SelectItem>
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-sm text-red-500 mt-1">{errors.country.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              {...register("category")}
              placeholder="e.g., Working Capital, Equipment Financing"
            />
            {errors.category && (
              <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min_amount">Minimum Amount</Label>
            <Input
              id="min_amount"
              type="number"
              step="1"
              {...register("min_amount")}
              placeholder="e.g., 10000"
            />
          </div>
          <div>
            <Label htmlFor="max_amount">Maximum Amount</Label>
            <Input
              id="max_amount"
              type="number"
              step="1"
              {...register("max_amount")}
              placeholder="e.g., 500000"
            />
          </div>
        </div>
        {errors.min_amount && (
          <p className="text-sm text-red-500">{errors.min_amount.message}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min_time_in_business">Min Time in Business (months)</Label>
            <Input
              id="min_time_in_business"
              type="number"
              {...register("min_time_in_business")}
              placeholder="e.g., 12"
            />
          </div>
          <div>
            <Label htmlFor="min_monthly_revenue">Min Monthly Revenue</Label>
            <Input
              id="min_monthly_revenue"
              type="number"
              step="1"
              {...register("min_monthly_revenue")}
              placeholder="e.g., 50000"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="required_documents">Required Documents (comma-separated)</Label>
          <Input
            id="required_documents"
            {...register("required_documents")}
            placeholder="Bank Statements (6 months), Business Tax Returns, etc."
          />
          <p className="text-sm text-gray-500 mt-1">
            Separate multiple documents with commas
          </p>
        </div>

        <div>
          <Label htmlFor="excluded_industries">Excluded Industries (comma-separated)</Label>
          <Input
            id="excluded_industries"
            {...register("excluded_industries")}
            placeholder="Cannabis, Gambling, Adult Entertainment, etc."
          />
          <p className="text-sm text-gray-500 mt-1">
            Separate multiple industries with commas
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="active"
            {...register("active")}
            defaultChecked={true}
          />
          <Label htmlFor="active" className="text-sm font-medium">
            Active Product
          </Label>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t">
        <Button 
          type="submit" 
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? "Saving..." : (id ? "Update Product" : "Create Product")}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}