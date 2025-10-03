import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useV1Products, useV1Lenders } from "@/hooks/useLenderCatalog";
import { Loader2 } from "lucide-react";

export default function LenderProductsV1Page() {
  const { data: products, isLoading: productsLoading, error: productsError } = useV1Products();
  const { data: lendersData, isLoading: lendersLoading, error: lendersError } = useV1Lenders();
  
  const lenders = lendersData?.lenders || [];

  if (productsLoading || lendersLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading lender data...</span>
        </div>
      </div>
    );
  }

  if (productsError || lendersError) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-red-500">
              Error loading data: {productsError?.message || lendersError?.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group products by country
  const productsByCountry = products?.reduce((acc, product) => {
    const country = product.countryOffered || 'Unknown';
    if (!acc[country]) acc[country] = [];
    acc[country].push(product);
    return acc;
  }, {} as Record<string, typeof products>) || {};

  // Group products by category
  const productsByCategory = products?.reduce((acc, product) => {
    const category = product.productCategory || 'Unknown';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof products>) || {};

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lender Products (V1 API)</h1>
          <p className="text-muted-foreground">
            Displaying {products?.length || 0} products from {lenders.length} lenders
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lenders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(productsByCountry).length}</div>
            <div className="text-xs text-muted-foreground">
              {Object.keys(productsByCountry).join(', ')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(productsByCategory).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Country Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Products by Country</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(productsByCountry).map(([country, countryProducts]) => (
              <div key={country} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{country}</Badge>
                  <span className="font-medium">{countryProducts.length} products</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lenders List */}
      <Card>
        <CardHeader>
          <CardTitle>Lenders Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender Name</TableHead>
                <TableHead>Product Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lenders.map((lender) => (
                <TableRow key={lender.id}>
                  <TableCell className="font-medium">{lender.name}</TableCell>
                  <TableCell>{lender.product_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Lender</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Min Amount</TableHead>
                <TableHead>Max Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.productName}</TableCell>
                  <TableCell>{product.lenderName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.productCategory}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.countryOffered === 'CA' ? 'default' : 'secondary'}>
                      {product.countryOffered}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(product.minimumLendingAmount)}</TableCell>
                  <TableCell>{formatCurrency(product.maximumLendingAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? 'default' : 'destructive'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}