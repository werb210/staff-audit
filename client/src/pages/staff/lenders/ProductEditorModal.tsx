// Dev auto-patch: disable SW when VITE_DISABLE_SW=1
if ((import.meta as any).env?.VITE_DISABLE_SW==='1') { console.info('SW disabled for dev'); /* early return */ }

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductWithRulesSchema, ProductWithRulesInput } from "@/schemas/productWithRules";
import { getProductWithRules, upsertProductWithRules } from "@/api/lenderProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X, Package, Shield, FileText, Globe, Settings } from "lucide-react";

type Props = { 
  open: boolean; 
  onClose: () => void; 
  productId?: string; 
  lenderId: string; 
  initialTab?: "basics" | "rules" 
};

const DOCUMENT_OPTIONS = [
  "bank_statements", "tax_returns", "financial_statements", "business_plan",
  "balance_sheet", "profit_loss", "cash_flow", "personal_guarantee",
  "collateral_documents", "insurance_certificate", "lease_agreement"
];

const CATEGORY_OPTIONS = [
  { value: "business_loan", label: "Business Loan" },
  { value: "equipment_financing", label: "Equipment Financing" },
  { value: "line_of_credit", label: "Line of Credit" },
  { value: "invoice_factoring", label: "Invoice Factoring" },
  { value: "merchant_cash_advance", label: "Merchant Cash Advance" },
  { value: "real_estate", label: "Real Estate" },
  { value: "sba_loan", label: "SBA Loan" },
  { value: "other", label: "Other" }
];

export default function ProductEditorModal({ open, onClose, productId, lenderId, initialTab = "basics" }: Props) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProductWithRulesInput>({
    resolver: zodResolver(ProductWithRulesSchema),
    defaultValues: { 
      lenderId, 
      name: "", 
      active: true, 
      category: "business_loan",
      countryOffered: "CA",
      rules: {} 
    },
  });

  useEffect(() => {
    if (!productId || !open) return;
    setLoading(true);
    getProductWithRules(productId)
      .then((p) => {
        form.reset({
          ...p,
          lenderId: p.lenderId || lenderId,
          rules: p.rules || {}
        });
      })
      .catch((e) => {
        console.error('Failed to load product:', e);
        toast({
          title: "Load Failed",
          description: "Failed to load product data",
          variant: "destructive"
        });
      })
      .finally(() => setLoading(false));
  }, [productId, open, form, lenderId, toast]);

  const saveMutation = useMutation({
    mutationFn: async (values: ProductWithRulesInput) => {
      const payload = { ...values, lenderId, id: productId };
      return upsertProductWithRules(payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lender-products'] });
      queryClient.invalidateQueries({ queryKey: ['lenders'] });
      toast({
        title: productId ? "Product Updated" : "Product Created",
        description: `Product has been ${productId ? 'updated' : 'created'} successfully.`
      });
      onClose();
    },
    onError: (error: any) => {
      console.error('Save failed:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save product. Please try again.",
        variant: "destructive"
      });
    }
  });

  async function onSubmit(values: ProductWithRulesInput) {
    saveMutation.mutate(values);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/50">
      <div className="mt-12 w-[960px] max-w-[96%] rounded-2xl bg-white shadow-xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            {productId ? "Edit Lender Product" : "Create Lender Product"}
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button 
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  tab === "basics" 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`} 
                onClick={() => setTab("basics")}
              >
                <Package className="w-4 h-4 inline mr-1" />
                Basics
              </button>
              <button 
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  tab === "rules" 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`} 
                onClick={() => setTab("rules")}
              >
                <Shield className="w-4 h-4 inline mr-1" />
                Eligibility & Docs
              </button>
            </div>
            <button 
              className="text-gray-400 hover:text-gray-600 ml-2" 
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-auto">
            {loading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading product data...</span>
              </div>
            )}

            {!loading && tab === "basics" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input 
                      id="name"
                      {...form.register("name")} 
                      placeholder="Business Term Loan" 
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={form.watch("category") || ""} 
                      onValueChange={(value) => form.setValue("category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        {CATEGORY_OPTIONS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value} className="text-gray-900 hover:bg-gray-100">
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="countryOffered">Country Offered</Label>
                    <Input 
                      id="countryOffered"
                      {...form.register("countryOffered")} 
                      placeholder="CA" 
                    />
                  </div>
                  <div className="space-y-1 flex items-center">
                    <Checkbox
                      id="active"
                      checked={form.watch("active") ?? true}
                      onCheckedChange={(checked) => form.setValue("active", checked as boolean)}
                    />
                    <Label htmlFor="active" className="ml-2">Active Product</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Loan Amounts</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="minAmount">Minimum Amount ($)</Label>
                      <Input 
                        id="minAmount"
                        type="number"
                        {...form.register("minAmount", { valueAsNumber: true })} 
                        placeholder="10000" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxAmount">Maximum Amount ($)</Label>
                      <Input 
                        id="maxAmount"
                        type="number"
                        {...form.register("maxAmount", { valueAsNumber: true })} 
                        placeholder="1000000" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Interest Rates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="minRate">Minimum Rate (%)</Label>
                      <Input 
                        id="minRate"
                        type="number"
                        step="0.01"
                        {...form.register("minRate", { valueAsNumber: true })} 
                        placeholder="5.5" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxRate">Maximum Rate (%)</Label>
                      <Input 
                        id="maxRate"
                        type="number"
                        step="0.01"
                        {...form.register("maxRate", { valueAsNumber: true })} 
                        placeholder="18.5" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Terms</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="minTermMonths">Minimum Term (months)</Label>
                      <Input 
                        id="minTermMonths"
                        type="number"
                        {...form.register("minTermMonths", { valueAsNumber: true })} 
                        placeholder="6" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxTermMonths">Maximum Term (months)</Label>
                      <Input 
                        id="maxTermMonths"
                        type="number"
                        {...form.register("maxTermMonths", { valueAsNumber: true })} 
                        placeholder="60" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Product description and requirements..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {!loading && tab === "rules" && (
              <div className="space-y-6">
                <section className="rounded-xl border p-4 space-y-4">
                  <div className="font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Basic Criteria
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="minCreditScore">Minimum Credit Score</Label>
                      <Input 
                        id="minCreditScore"
                        type="number" 
                        {...form.register("rules.minCreditScore", { valueAsNumber: true })} 
                        placeholder="e.g., 650" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="minAnnualRevenue">Minimum Annual Revenue ($)</Label>
                      <Input 
                        id="minAnnualRevenue"
                        type="number" 
                        {...form.register("rules.minAnnualRevenue", { valueAsNumber: true })} 
                        placeholder="e.g., 1000000" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="timeInBusinessMonths">Time in Business (months)</Label>
                      <Input 
                        id="timeInBusinessMonths"
                        type="number" 
                        {...form.register("rules.timeInBusinessMonths", { valueAsNumber: true })} 
                        placeholder="e.g., 12" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxDebtToIncome">Max Debt-to-Income</Label>
                      <Input 
                        id="maxDebtToIncome"
                        type="number" 
                        step="0.01" 
                        {...form.register("rules.maxDebtToIncome", { valueAsNumber: true })} 
                        placeholder="e.g., 0.40" 
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border p-4 space-y-4">
                  <div className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Required Documents
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DOCUMENT_OPTIONS.map((doc) => {
                      const currentDocs = form.watch("rules.requiredDocs") || [];
                      const isChecked = currentDocs.includes(doc);
                      return (
                        <div key={doc} className="flex items-center space-x-2">
                          <Checkbox
                            id={doc}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const current = form.getValues("rules.requiredDocs") || [];
                              if (checked) {
                                form.setValue("rules.requiredDocs", [...current, doc]);
                              } else {
                                form.setValue("rules.requiredDocs", current.filter(d => d !== doc));
                              }
                            }}
                          />
                          <Label htmlFor={doc} className="text-sm">
                            {doc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-xl border p-4 space-y-4">
                  <div className="font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Industry & Geography
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="preferredIndustries">Preferred Industries (comma-separated)</Label>
                      <Input 
                        id="preferredIndustries"
                        placeholder="e.g., technology, healthcare, manufacturing"
                        value={(form.watch("rules.preferredIndustries") || []).join(", ")}
                        onChange={(e) => {
                          const industries = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          form.setValue("rules.preferredIndustries", industries);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="excludedIndustries">Excluded Industries (comma-separated)</Label>
                      <Input 
                        id="excludedIndustries"
                        placeholder="e.g., gambling, tobacco, adult entertainment"
                        value={(form.watch("rules.excludedIndustries") || []).join(", ")}
                        onChange={(e) => {
                          const industries = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          form.setValue("rules.excludedIndustries", industries);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="excludedRegions">Excluded Regions (comma-separated)</Label>
                      <Input 
                        id="excludedRegions"
                        placeholder="e.g., CA, NY, TX"
                        value={(form.watch("rules.excludedRegions") || []).join(", ")}
                        onChange={(e) => {
                          const regions = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          form.setValue("rules.excludedRegions", regions);
                        }}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border p-4 space-y-4">
                  <div className="font-semibold">Advanced Custom Logic</div>
                  <div className="space-y-1">
                    <Textarea 
                      className="font-mono text-sm"
                      placeholder='e.g., credit_score >= 700 && annual_revenue >= 500000'
                      rows={4}
                      {...form.register("rules.advancedLogic")}
                    />
                    <p className="text-xs text-gray-500">
                      Advanced users can write custom eligibility expressions
                    </p>
                  </div>
                </section>
              </div>
            )}
          </div>

          <div className="p-4 border-t flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || loading}>
              {saveMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Product'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}