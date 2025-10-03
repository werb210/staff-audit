import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Globe, MapPin, Calendar, Building2 } from "lucide-react";
import { api } from "@/lib/queryClient";

interface LenderData {
  id: string;
  lender_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  country_offered?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function LenderDetailPage() {
  const [location, navigate] = useLocation();
  
  // Extract lender ID from URL path like /staff/lenders/[id]
  const pathParts = location.split('/');
  const lenderId = pathParts[pathParts.length - 1];
  
  
  if (!lenderId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Lender ID</h2>
          <p className="text-gray-600 mb-4">No lender ID provided in the URL.</p>
          <Button onClick={() => navigate('/staff/lenders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lenders
          </Button>
        </div>
      </div>
    );
  }

  // Fetch lender details
  const { data: lender, isLoading, error } = useQuery({
    queryKey: ['lenders', lenderId],
    queryFn: async () => {
      // Use the canonical lenders API
      const allLenders = await api(`/api/lenders`);
      const foundLender = allLenders?.find((l: any) => l.id === lenderId);
      
      if (foundLender) {
        return {
          id: foundLender.id,
          name: foundLender.name,
          lender_name: foundLender.name,
          email: foundLender.email || '',
          phone: foundLender.phone || '',
          website: foundLender.website || '',
          country_offered: foundLender.country_offered || '',
          is_active: foundLender.is_active,
          created_at: foundLender.created_at,
          updated_at: foundLender.updated_at
        } as LenderData;
      }
      
      throw new Error('Lender not found');
    },
  });

  // Fetch lender products
  const { data: products = [] } = useQuery({
    queryKey: ['lender-products', lenderId],
    queryFn: async () => {
      const response = await api('/api/lender-products');
      // Handle canonical schema response format
      const products = response?.products || response || [];
      return Array.isArray(products) ? products.filter((product: any) => product.lenderName === (lender?.name || lender?.lender_name)) : [];
    },
    enabled: !!lender,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lender details...</p>
        </div>
      </div>
    );
  }

  if (error || !lender) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lender Not Found</h2>
          <p className="text-gray-600 mb-4">The lender you're looking for doesn't exist or couldn't be loaded.</p>
          <Button onClick={() => navigate('/staff/lenders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lenders
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatRate = (rateMin: number, rateMax?: number) => {
    if (rateMax && rateMax !== rateMin) {
      return `${(rateMin * 100).toFixed(1)}% - ${(rateMax * 100).toFixed(1)}%`;
    }
    return `${(rateMin * 100).toFixed(1)}%`;
  };

  const formatTerm = (termMin: number, termMax?: number) => {
    if (termMax && termMax !== termMin) {
      return `${termMin} - ${termMax} months`;
    }
    return `${termMin} months`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/staff/lenders')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lenders
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {lender.lender_name || lender.name || 'Unknown Lender'}
            </h1>
            <p className="text-gray-600 mt-1">Lender details and information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={lender.is_active ? "default" : "secondary"}>
            {lender.is_active ? "Active" : "Inactive"}
          </Badge>
          {lender.country_offered && (
            <Badge variant="outline">{lender.country_offered}</Badge>
          )}
        </div>
      </div>

      {/* Lender Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lender.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-gray-600">{lender.email}</p>
                </div>
              </div>
            )}
            
            {lender.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-gray-600">{lender.phone}</p>
                </div>
              </div>
            )}
            
            {lender.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Website</p>
                  <a 
                    href={lender.website.startsWith('http') ? lender.website : `https://${lender.website}`}
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {lender.website}
                  </a>
                </div>
              </div>
            )}
            
            {lender.country_offered && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Country</p>
                  <p className="text-sm text-gray-600">{lender.country_offered}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <div>
                <p className="text-sm font-medium">Lender ID</p>
                <p className="text-sm text-gray-600 font-mono">{lender.id}</p>
              </div>
            </div>
            
            {lender.created_at && (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-gray-600">
                    {new Date(lender.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
            
            {lender.updated_at && (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-gray-600">
                    {new Date(lender.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <div className="grid gap-4">
              {products.map((product: any) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{product.product_name}</h3>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Amount: {formatCurrency(product.minimum_lending_amount || 0)} - {formatCurrency(product.maximum_lending_amount || 0)}</div>
                        {product.interest_rate_minimum && (
                          <div>Rate: {formatRate(product.interest_rate_minimum, product.interest_rate_maximum)}</div>
                        )}
                        {product.term_minimum && (
                          <div>Term: {formatTerm(product.term_minimum, product.term_maximum)}</div>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-sm text-gray-600 mt-2">{product.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
              <p>This lender doesn't have any products in the system yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}