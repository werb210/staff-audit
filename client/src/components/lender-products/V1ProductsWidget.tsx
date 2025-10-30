import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useV1Products, useV1Lenders } from "@/hooks/useLenderCatalog";
import { Loader2 } from "lucide-react";

export default function V1ProductsWidget() {
  const { data: products, isLoading: productsLoading } = useV1Products();
  const { data: lendersData, isLoading: lendersLoading } = useV1Lenders();

  const lenders = lendersData?.lenders || [];

  if (productsLoading || lendersLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quick stats
  const caProducts =
    products?.filter((p) => p.countryOffered === "CA").length || 0;
  const usProducts =
    products?.filter((p) => p.countryOffered === "US").length || 0;
  const categories = new Set(products?.map((p) => p.productCategory)).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">V1 Lender Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold">{products?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total Products</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold">{lenders.length}</div>
            <div className="text-sm text-muted-foreground">Lenders</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Canada Products:</span>
            <Badge variant="default">{caProducts}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">US Products:</span>
            <Badge variant="secondary">{usProducts}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Categories:</span>
            <Badge variant="outline">{categories}</Badge>
          </div>
        </div>

        <div className="pt-2">
          <div className="text-sm font-medium mb-2">
            Top Lenders by Products:
          </div>
          <div className="space-y-1">
            {lenders.slice(0, 5).map((lender) => (
              <div key={lender.id} className="flex justify-between text-xs">
                <span className="truncate">{lender.name}</span>
                <span className="text-muted-foreground">
                  {lender.product_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
