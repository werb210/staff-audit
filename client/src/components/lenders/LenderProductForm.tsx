import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/queryClient";
import { PRODUCT_CATEGORIES } from "@/constants/requiredDocuments";

const lenderProductSchema = z
  .object({
    lenderId: z.string().uuid("Please select a valid lender"),
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must be less than 80 characters"),
    country: z.enum(["CA", "US"], {
      required_error: "Please select a country",
    }),
    category: z.enum(PRODUCT_CATEGORIES as [string, ...string[]], {
      required_error: "Please select a category",
    }),
    amountMin: z
      .number()
      .min(0, "Minimum amount must be 0 or greater")
      .optional(),
    amountMax: z
      .number()
      .min(0, "Maximum amount must be 0 or greater")
      .optional(),
    termMin: z
      .number()
      .min(1, "Minimum term must be at least 1 month")
      .max(120, "Minimum term cannot exceed 120 months")
      .optional(),
    termMax: z
      .number()
      .min(1, "Maximum term must be at least 1 month")
      .max(120, "Maximum term cannot exceed 120 months")
      .optional(),
    rateFrom: z
      .number()
      .min(0, "Rate must be 0 or greater")
      .max(100, "Rate cannot exceed 100%")
      .optional(),
    rateTo: z
      .number()
      .min(0, "Rate must be 0 or greater")
      .max(100, "Rate cannot exceed 100%")
      .optional(),
    feesFlat: z.number().min(0, "Flat fees must be 0 or greater").optional(),
    feesPct: z
      .number()
      .min(0, "Percentage fees must be 0 or greater")
      .optional(),
    statesOrProvinces: z.array(z.string()).optional(),
    status: z.enum(["active", "inactive", "pending"], {
      required_error: "Please select a status",
    }),
    rules: z.record(z.any()).optional(),
  })
  .refine(
    (data) => {
      if (data.amountMin !== undefined && data.amountMax !== undefined) {
        return data.amountMin <= data.amountMax;
      }
      return true;
    },
    {
      message: "Minimum amount must be less than or equal to maximum amount",
      path: ["amountMax"],
    },
  )
  .refine(
    (data) => {
      if (data.termMin !== undefined && data.termMax !== undefined) {
        return data.termMin <= data.termMax;
      }
      return true;
    },
    {
      message: "Minimum term must be less than or equal to maximum term",
      path: ["termMax"],
    },
  )
  .refine(
    (data) => {
      if (data.rateFrom !== undefined && data.rateTo !== undefined) {
        return data.rateFrom <= data.rateTo;
      }
      return true;
    },
    {
      message: "Rate from must be less than or equal to rate to",
      path: ["rateTo"],
    },
  );

type LenderProductFormData = z.infer<typeof lenderProductSchema>;

type Mode = "create" | "edit";

interface LenderProductFormProps {
  open: boolean;
  mode: Mode;
  productId?: string;
  onClose: () => void;
  onSaved: (product: any) => void;
}

export default function LenderProductForm({
  open,
  mode,
  productId,
  onClose,
  onSaved,
}: LenderProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<LenderProductFormData>({
    resolver: zodResolver(lenderProductSchema),
    defaultValues: {
      lenderId: "",
      name: "",
      country: "CA",
      category: PRODUCT_CATEGORIES[0] as any,
      status: "active",
      amountMin: undefined,
      amountMax: undefined,
      termMin: undefined,
      termMax: undefined,
      rateFrom: undefined,
      rateTo: undefined,
      feesFlat: undefined,
      feesPct: undefined,
      statesOrProvinces: [],
      rules: {},
    },
  });

  // Fetch lenders for the dropdown
  const { data: lenders } = useQuery({
    queryKey: ["lenders"],
    queryFn: async () => {
      const response = await api("/api/lenders");
      return response as {
        id: string;
        name: string;
        countryCoverage?: string;
      }[];
    },
  });

  // Fetch product data for edit mode
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["lender-product", productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await api(`/api/lender-products/${productId}`);
      return response;
    },
    enabled: mode === "edit" && !!productId,
  });

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (mode === "create") {
        form.reset({
          lenderId: "",
          name: "",
          country: "CA",
          category: PRODUCT_CATEGORIES[0] as any,
          status: "active",
          amountMin: undefined,
          amountMax: undefined,
          termMin: undefined,
          termMax: undefined,
          rateFrom: undefined,
          rateTo: undefined,
          feesFlat: undefined,
          feesPct: undefined,
          statesOrProvinces: [],
          rules: {},
        });
      } else if (mode === "edit" && productData) {
        form.reset({
          lenderId: productData.lenderId || "",
          name: productData.name || "",
          country: productData.country || "CA",
          category: productData.category || PRODUCT_CATEGORIES[0],
          status: productData.status || "active",
          amountMin: productData.amountMin,
          amountMax: productData.amountMax,
          termMin: productData.termMin,
          termMax: productData.termMax,
          rateFrom: productData.rateFrom,
          rateTo: productData.rateTo,
          feesFlat: productData.feesFlat,
          feesPct: productData.feesPct,
          statesOrProvinces: productData.statesOrProvinces || [],
          rules: productData.rules || {},
        });
      }
    }
  }, [open, mode, productData, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: LenderProductFormData) => {
      console.log("🔨 Creating lender product:", data);
      const response = await api("/api/lender-products", {
        method: "POST",
        body: data,
      });
      return response;
    },
    onSuccess: (product) => {
      console.log("✅ Product created successfully:", product);
      toast({
        title: "Product Created",
        description: "Lender product has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["lender-products"] });
      onSaved(product);
      onClose();
    },
    onError: (error: any) => {
      console.error("❌ Failed to create product:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create lender product",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: LenderProductFormData) => {
      if (!productId) throw new Error("Product ID is required for update");
      console.log("📝 Updating lender product:", productId, data);
      const response = await api(`/api/lender-products/${productId}`, {
        method: "PUT",
        body: data,
      });
      return response;
    },
    onSuccess: (product) => {
      console.log("✅ Product updated successfully:", product);
      toast({
        title: "Product Updated",
        description: "Lender product has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["lender-products"] });
      queryClient.invalidateQueries({
        queryKey: ["lender-product", productId],
      });
      onSaved(product);
      onClose();
    },
    onError: (error: any) => {
      console.error("❌ Failed to update product:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update lender product",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Product ID is required for delete");
      console.log("🗑️ Deleting lender product:", productId);
      const response = await api(`/api/lender-products/${productId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      console.log("✅ Product deleted successfully");
      toast({
        title: "Product Deleted",
        description: "Lender product has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["lender-products"] });
      onClose();
    },
    onError: (error: any) => {
      console.error("❌ Failed to delete product:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete lender product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LenderProductFormData) => {
    if (mode === "create") {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this lender product? This action cannot be undone.",
      )
    ) {
      setIsDeleting(true);
      deleteMutation.mutate();
    }
  };

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Lender Product" : "Edit Lender Product"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new lender product with specific terms and conditions."
              : "Update the lender product details and terms."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingProduct && mode === "edit" ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading product data...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Lender */}
                <FormField
                  control={form.control}
                  name="lenderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lender *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a lender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {lenders?.map((lender) => (
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

                {/* Product Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Business Line of Credit"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="US">United States</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRODUCT_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount Range */}
                <FormField
                  control={form.control}
                  name="amountMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amountMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Term Range */}
                <FormField
                  control={form.control}
                  name="termMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Term (months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="termMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Term (months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="120"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rate Range */}
                <FormField
                  control={form.control}
                  name="rateFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate From (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rateTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate To (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="100.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fees */}
                <FormField
                  control={form.control}
                  name="feesFlat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flat Fees</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="feesPct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage Fees (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Status *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex justify-between">
                <div className="flex gap-2">
                  {mode === "edit" && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isLoading || isDeleting}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {mode === "create" ? "Creating..." : "Updating..."}
                      </>
                    ) : mode === "create" ? (
                      "Create Product"
                    ) : (
                      "Update Product"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
