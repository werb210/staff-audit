import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Edit, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LenderProductViewProps {
  id: string;
  onEdit?: () => void;
  onBack?: () => void;
}

interface ProductData {
  id: string;
  productName: string;
  lenderName?: string;
  countryOffered: string;
  productCategory: string;
  minimumLendingAmount?: number;
  maximumLendingAmount?: number;
  isActive: boolean;
  min_time_in_business?: number;
  min_monthly_revenue?: number;
  required_documents: string[];
  excluded_industries: string[];
}

export default function LenderProductView({ id, onEdit, onBack }: LenderProductViewProps) {
  const { toast } = useToast();
  const [product, setProduct] = React.useState<ProductData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/v1/products/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to load product: ${response.status}`);
        }
        
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        console.error("Failed to load product:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
        toast({
          title: "Error",
          description: "Failed to load product data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, toast]);

  const formatCurrency = (amount?: number) => {
    if (amount == null) return "—";
    return amount.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    });
  };

  const formatAmount = (amount?: number) => {
    if (amount == null) return "—";
    return amount.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading product details...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">
          {error || "Product not found"}
        </div>
        {onBack && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">{product.productName}</h2>
            {product.lenderName && (
              <p className="text-gray-600">{product.lenderName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={product.isActive ? "default" : "secondary"}>
            {product.isActive ? "Active" : "Inactive"}
          </Badge>
          {onEdit && (
            <Button onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Product
            </Button>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-500">Country</Label>
            <div className="mt-1">
              <Badge variant="outline">
                {product.countryOffered === "CA" ? "🇨🇦 Canada" : "🇺🇸 United States"}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-500">Category</Label>
            <p className="mt-1 text-sm">{product.productCategory}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-500">Lending Range</Label>
            <p className="mt-1 text-sm">
              {formatCurrency(product.minimumLendingAmount)} – {formatCurrency(product.maximumLendingAmount)}
            </p>
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-500">Min Time in Business</Label>
            <p className="mt-1 text-sm">
              {product.min_time_in_business ? `${product.min_time_in_business} months` : "—"}
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-500">Min Monthly Revenue</Label>
            <p className="mt-1 text-sm">
              {formatCurrency(product.min_monthly_revenue)}
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-500">Status</Label>
            <div className="mt-1">
              <Badge variant={product.isActive ? "default" : "secondary"}>
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Required Documents */}
      {product.required_documents?.length > 0 && (
        <div>
          <Label className="text-sm font-medium text-gray-500">Required Documents</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.required_documents.map((doc, index) => (
              <Badge key={index} variant="outline">
                {doc}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Excluded Industries */}
      {product.excluded_industries?.length > 0 && (
        <div>
          <Label className="text-sm font-medium text-gray-500">Excluded Industries</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.excluded_industries.map((industry, index) => (
              <Badge key={index} variant="destructive">
                {industry}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Raw Data (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-gray-500">
            Raw Product Data (Development)
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(product, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}