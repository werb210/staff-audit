import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface UnifiedProductFormProps {
  lenderId: string;
  productId?: string;
  onSave?: () => void;
  onClose?: () => void;
}

export default function UnifiedProductForm({ lenderId, productId, onSave, onClose }: UnifiedProductFormProps) {
  const { toast } = useToast();
  const mode = useMemo(() => productId ? "edit" : "create", [productId]);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    country: "US",
    category: "Term Loan",
    minAmount: null as number | null,
    maxAmount: null as number | null,
    minTermMonths: null as number | null,
    maxTermMonths: null as number | null,
    minInterest: null as number | null,
    maxInterest: null as number | null,
    minCreditScore: null as number | null,
    isActive: true
  });

  useEffect(() => {
    if (!productId) return;
    (async () => {
      try {
        const r = await fetch(`/api/lenders/${lenderId}/products/${productId}`, {});
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        setForm({
          productName: j.productName ?? "",
          country: j.country ?? "US",
          category: j.category ?? "Term Loan",
          minAmount: j.minAmount ?? null,
          maxAmount: j.maxAmount ?? null,
          minTermMonths: j.minTermMonths ?? null,
          maxTermMonths: j.maxTermMonths ?? null,
          minInterest: j.minInterest ?? null,
          maxInterest: j.maxInterest ?? null,
          minCreditScore: j.minCreditScore ?? null,
          isActive: !!j.isActive
        });
      } catch (e) {
        toast({
          title: "Load Failed",
          description: String(e),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [lenderId, productId, toast]);

  const save = async () => {
    setSaving(true);
    try {
      const url = productId
        ? `/api/lender-products/${productId}`
        : `/api/lender-products`;
      const method = productId ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({
          ...form,
          lenderId: lenderId
        })
      });
      
      if (r.status === 412) {
        const j = await r.json();
        throw new Error("ASK: " + (j.asks || []).join(", "));
      }
      if (!r.ok) throw new Error(await r.text());
      
      toast({
        title: "Success",
        description: `Product ${mode === "create" ? "created" : "updated"} successfully`
      });
      
      onSave?.();
    } catch (e) {
      toast({
        title: "Save Failed",
        description: String(e),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Add" : "Edit"} Lender Product</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              value={form.productName}
              onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={form.country} onValueChange={value => setForm(f => ({ ...f, country: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={value => setForm(f => ({ ...f, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Business Line of Credit">Business Line of Credit</SelectItem>
                  <SelectItem value="Term Loan">Term Loan</SelectItem>
                  <SelectItem value="Equipment Financing">Equipment Financing</SelectItem>
                  <SelectItem value="Invoice Factoring">Invoice Factoring</SelectItem>
                  <SelectItem value="Purchase Order Financing">Purchase Order Financing</SelectItem>
                  <SelectItem value="Working Capital">Working Capital</SelectItem>
                  <SelectItem value="Asset-Based Lending">Asset-Based Lending</SelectItem>
                  <SelectItem value="SBA Loan">SBA Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minAmount">Minimum Amount ($)</Label>
              <Input
                id="minAmount"
                type="number"
                value={form.minAmount ?? ""}
                onChange={e => setForm(f => ({ ...f, minAmount: e.target.value ? Number(e.target.value) : null }))}
                placeholder="10000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAmount">Maximum Amount ($)</Label>
              <Input
                id="maxAmount"
                type="number"
                value={form.maxAmount ?? ""}
                onChange={e => setForm(f => ({ ...f, maxAmount: e.target.value ? Number(e.target.value) : null }))}
                placeholder="1000000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minTermMonths">Minimum Term (months)</Label>
              <Input
                id="minTermMonths"
                type="number"
                value={form.minTermMonths ?? ""}
                onChange={e => setForm(f => ({ ...f, minTermMonths: e.target.value ? Number(e.target.value) : null }))}
                placeholder="6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTermMonths">Maximum Term (months)</Label>
              <Input
                id="maxTermMonths"
                type="number"
                value={form.maxTermMonths ?? ""}
                onChange={e => setForm(f => ({ ...f, maxTermMonths: e.target.value ? Number(e.target.value) : null }))}
                placeholder="60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minInterest">Minimum Interest Rate (%)</Label>
              <Input
                id="minInterest"
                type="number"
                step="0.01"
                value={form.minInterest ?? ""}
                onChange={e => setForm(f => ({ ...f, minInterest: e.target.value ? Number(e.target.value) : null }))}
                placeholder="5.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxInterest">Maximum Interest Rate (%)</Label>
              <Input
                id="maxInterest"
                type="number"
                step="0.01"
                value={form.maxInterest ?? ""}
                onChange={e => setForm(f => ({ ...f, maxInterest: e.target.value ? Number(e.target.value) : null }))}
                placeholder="18.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minCreditScore">Minimum Credit Score</Label>
            <Input
              id="minCreditScore"
              type="number"
              value={form.minCreditScore ?? ""}
              onChange={e => setForm(f => ({ ...f, minCreditScore: e.target.value ? Number(e.target.value) : null }))}
              placeholder="650"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Product description and requirements..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantId">Tenant ID</Label>
            <Input
              id="tenantId"
              value={form.tenantId}
              onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))}
              placeholder="Enter tenant ID"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={form.isActive}
              onCheckedChange={checked => setForm(f => ({ ...f, isActive: checked }))}
            />
            <Label htmlFor="isActive">Active Product</Label>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : `${mode === "create" ? "Create" : "Update"} Product`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}