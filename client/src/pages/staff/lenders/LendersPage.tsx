import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building2, Plus, Edit, Trash2, Eye, Search, Filter, X, Target, Settings, Database } from 'lucide-react';
import { useLocation } from "wouter";
import SiloSwitcher from '@/components/layout/SiloSwitcher';
import CreateEditLenderModal from './CreateEditLenderModal';
import EditLenderModal from './EditLenderModal';
import UnifiedProductForm from './UnifiedProductForm';
import ViewProductModal from './ViewProductModal';
import LenderCatalogTable from '@/components/lenders/LenderCatalogTable';
import LendersSyncButton from '@/components/LendersSyncButton';
import CreateLenderButton from '@/components/lenders/CreateLenderButton';
import { useToast } from '@/hooks/use-toast';
import { useFeaturePanel, FeatureActionButton } from '@/features/featureWiring';

interface Lender {
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  min: number;
  max: number;
  active: boolean;
  country: string;
}

interface LenderProduct {
  id: string;
  lender_id: string;
  lender_name?: string;
  name: string;
  category: string;
  country: string;
  min_amount: number;
  max_amount: number;
  rate_min: number;
  rate_max: number;
  term_min: number;
  term_max: number;
  active: boolean;
  fees?: string;
  eligibility?: string;
  data?: {
    required_docs?: string[];
  };
  updated_at?: string;
}

export function LendersPage() {
  useFeaturePanel("lenders");
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('lenders');
  
  // Better currency formatting and amount field mapping
  const fmt = (n?: number) =>
    (typeof n === 'number' ? n : undefined)?.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }) ?? '—';

  const getRange = (p: any) => {
    const min = p.minimumLendingAmount ?? p.min_amount ?? p.minAmount ?? p.minimum_amount;
    const max = p.maximumLendingAmount ?? p.max_amount ?? p.maxAmount ?? p.maximum_amount;
    return `${fmt(min)} – ${fmt(max)}`;
  };
  const [editingLender, setEditingLender] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [selectedLender, setSelectedLender] = useState<any>(null);
  const [showMatchingRulesModal, setShowMatchingRulesModal] = useState<{ product: any; show: boolean } | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showUnifiedForm, setShowUnifiedForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [showViewProductModal, setShowViewProductModal] = useState(false);
  const queryClient = useQueryClient();

  // Delete lender mutation
  const deleteLenderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api(`/api/lenders/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      console.log('✅ Lender deleted successfully, refreshing data...');
      queryClient.invalidateQueries({ queryKey: ['lenders'] });
      queryClient.invalidateQueries({ queryKey: ['lender-products'] });
      toast({
        title: "Lender Deleted",
        description: "Lender has been successfully deactivated.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the lender. Please try again.",
        variant: "destructive",
      });
      console.error('Delete lender error:', error);
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api(`/api/lender-products/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lender-products'] });
      toast({
        title: "Product Deleted",
        description: "Product has been successfully removed from the catalog.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the product. Please try again.",
        variant: "destructive",
      });
      console.error('Delete product error:', error);
    }
  });

  const handleDeleteLender = (id: string) => {
    deleteLenderMutation.mutate(id);
  };

  const handleDeleteProduct = (id: string) => {
    deleteProductMutation.mutate(id);
  };
  const [location, navigate] = useLocation();

  // REMOVED MANUAL TEST - React Query should work now

  // Lenders data - Clean API call (fixed QueryClient issue)
  const { data: lenders = [], isLoading: loadingLenders, error: lendersError } = useQuery({
    queryKey: ['lenders'],
    queryFn: async () => {
      console.log('✅ [LENDERS] Fetching from /api/lenders');
      const response = await api('/api/lenders');
      console.log('✅ [LENDERS] Received:', response?.length || 0, 'lenders');
      return response || [];
    },
  });

  // Lender Products data - using clean API
  const { data: lenderProducts = [], isLoading: loadingProducts, error: productsError } = useQuery({
    queryKey: ['lender-products'],
    queryFn: async () => {
      console.log('🔄 [PRODUCTS] Fetching products from /api/lender-products');
      const response = await api('/api/lender-products');
      console.log('✅ [PRODUCTS] Response received:', response);
      const products = response?.products?.map((product: any) => ({
        id: product.id,
        lender_id: product.lenderId,
        lender_name: product.lender,
        name: product.productName,
        category: product.category,
        country: product.country,
        min_amount: product.minAmount,
        max_amount: product.maxAmount,
        rate_min: product.minInterest,
        rate_max: product.maxInterest,
        term_min: product.minTermMonths,
        term_max: product.maxTermMonths,
        active: product.isActive
      })) || [];
      console.log('✅ [PRODUCTS] Mapped products:', products?.length || 0);
      return products;
    },
    onError: (error) => {
      console.error('❌ [PRODUCTS] Query failed:', error);
      toast({
        title: "Failed to load products",
        description: String(error),
        variant: "destructive",
      });
    }
  });



  // No filtering - show all data immediately
  const filteredLenders = Array.isArray(lenders) ? lenders : [];
  const filteredProducts = Array.isArray(lenderProducts) ? lenderProducts : [];
  
  // Clean up debug logs - should work now
  console.log('🔍 [RENDER] lenders:', lenders?.length || 0, 'items, loading:', loadingLenders);

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
    <div>
      <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lenders & Products</h1>
          <p className="text-gray-600 mt-1">Manage your lending network and product offerings</p>
        </div>
        <div className="flex items-center gap-2">
          <LendersSyncButton />
          <FeatureActionButton 
            featureId="lenders"
            className="border rounded px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['lenders'] });
              queryClient.invalidateQueries({ queryKey: ['lender-products'] });
              toast({ title: "Lenders refreshed" });
            }}
          >
            ↻ Load Lenders
          </FeatureActionButton>
          {activeTab === 'lenders' ? (
            <CreateLenderButton>
              Add New Lender
            </CreateLenderButton>
          ) : (
            <Button 
              className="flex items-center gap-2"
              onClick={() => {
                setSelectedProduct(null);
                setShowUnifiedForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Lender Product
            </Button>
          )}
        </div>
      </div>


      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="lenders" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Lenders ({lenders.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            Products ({lenderProducts.length})
          </TabsTrigger>
        </TabsList>


        <TabsContent value="lenders">
          {loadingLenders ? (
            <div className="text-center py-8">Loading lenders...</div>
          ) : lendersError ? (
            <div className="text-center py-8 text-red-600">Error loading lenders: {String(lendersError)}</div>
          ) : (
            <div className="grid gap-4">
              {/* Debug panel removed - issue should be fixed */}
              {Array.isArray(filteredLenders) ? filteredLenders.map((lender: any) => (
                <div key={lender.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{lender.name}</h3>
                        <Badge variant="default">Active</Badge>
                        <Badge variant="outline">BF</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Products: {lender.productCount || 0} total</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔧 Edit button clicked for lender:', lender.name);
                          setEditingLender(lender);
                          setShowEditModal(true);
                        }}
                        title="Edit Lender"
                        className="hover:bg-blue-50 border-blue-200 text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🗑️ Delete button clicked for lender:', lender.name, 'ID:', lender.id);
                          console.log('🗑️ Mutation pending status:', deleteLenderMutation.isPending);
                          if (confirm(`Are you sure you want to deactivate ${lender.name}? This will permanently delete the lender. This action cannot be undone..`)) {
                            console.log('🗑️ User confirmed deletion, calling handleDeleteLender...');
                            handleDeleteLender(lender.id);
                          } else {
                            console.log('🗑️ User cancelled deletion');
                          }
                        }}
                        title="Delete Lender"
                        disabled={deleteLenderMutation.isPending}
                        className="hover:bg-red-50 border-red-200 text-red-600 disabled:opacity-50"
                      >
                        {deleteLenderMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )) : []}
              {(!Array.isArray(filteredLenders) || filteredLenders.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No lenders found matching your criteria
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="products">
          {loadingProducts ? (
            <div className="text-center py-8">Loading products...</div>
          ) : productsError ? (
            <div className="text-center py-8 text-red-600">Error loading products: {String(productsError)}</div>
          ) : (
            <div className="grid gap-4">
              {Array.isArray(filteredProducts) ? filteredProducts.map((product: any) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{product.category}</Badge>
                        {product.country && (
                          <Badge variant="outline">{product.country}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Lender: {product.lender_name}</div>
                        <div>Amount: {getRange(product)}</div>
                        {product.rate_min && (
                          <div>Rate: {formatRate(product.rate_min, product.rate_max)}</div>
                        )}
                        {product.term_min && (
                          <div>Term: {formatTerm(product.term_min, product.term_max)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowUnifiedForm(true);
                        }}
                        title="Manage Product"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              )) : []}
              {(!Array.isArray(filteredProducts) || filteredProducts.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No products found matching your criteria
                </div>
              )}
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* Enhanced Edit Lender Modal */}
      <EditLenderModal 
        lender={editingLender}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingLender(null);
        }}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['lenders'] });
        }}
      />

      {/* Comprehensive Create/Edit Lender Modal */}
      <CreateEditLenderModal 
        isOpen={showCreateEditModal}
        onClose={() => {
          setShowCreateEditModal(false);
          setSelectedLender(null);
        }}
        lender={selectedLender}
      />

      {/* Matching Rules Modal */}
      {showMatchingRulesModal?.show && (
        <Dialog open={showMatchingRulesModal.show} onOpenChange={(open) => !open && setShowMatchingRulesModal(null)}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b pb-3">
                <Target className="h-6 w-6 text-blue-600" />
                Matching Rules Configuration
              </DialogTitle>
              <div className="text-base text-gray-700 font-medium mt-2">
                Product: {showMatchingRulesModal.product?.name}
              </div>
            </DialogHeader>
            
            <div className="space-y-8 py-6">
              {/* Basic Criteria Section */}
              <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  Basic Criteria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      Minimum Credit Score
                    </Label>
                    <Input 
                      placeholder="e.g., 650" 
                      type="number" 
                      className="h-11 text-base font-medium border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-600">Required minimum credit score for applicants</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800">Minimum Annual Revenue</Label>
                    <Input 
                      placeholder="e.g., $100,000" 
                      type="number" 
                      className="h-11 text-base font-medium border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-600">Minimum yearly revenue requirement</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800">Time in Business (months)</Label>
                    <Input 
                      placeholder="e.g., 12" 
                      type="number" 
                      className="h-11 text-base font-medium border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-600">Minimum months in business</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800">Maximum Debt-to-Income Ratio</Label>
                    <Input 
                      placeholder="e.g., 0.40" 
                      type="number" 
                      step="0.01" 
                      className="h-11 text-base font-medium border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-600">Maximum acceptable debt ratio (decimal)</p>
                  </div>
                </div>
              </div>

              {/* Industry Preferences Section */}
              <div className="bg-green-50/50 p-6 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Industry Preferences
                </h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-800">Preferred Industries</Label>
                    <Textarea 
                      placeholder="Enter comma-separated industries (e.g., Manufacturing, Healthcare, Technology, Retail)"
                      className="min-h-[70px] text-base font-medium border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-600">Industries that are preferred for this product</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-800">Excluded Industries</Label>
                    <Textarea 
                      placeholder="Enter comma-separated industries to exclude (e.g., Cannabis, Adult Entertainment, Gambling)"
                      className="min-h-[70px] text-base font-medium border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-600">Industries that are not eligible for this product</p>
                  </div>
                </div>
              </div>

              {/* Required Documents Section */}
              <div className="bg-purple-50/50 p-6 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  Required Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Bank Statements (3 months)',
                    'Tax Returns (2 years)',
                    'Financial Statements',
                    'Business License',
                    'Articles of Incorporation',
                    'Personal Financial Statement',
                    'Lease Agreement',
                    'Voided Check'
                  ].map((doc) => (
                    <label key={doc} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2" 
                      />
                      <span className="text-sm font-medium text-gray-800">{doc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Geographic Restrictions Section */}
              <div className="bg-orange-50/50 p-6 rounded-lg border border-orange-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  Geographic Restrictions
                </h3>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-800">Excluded States/Regions</Label>
                  <Textarea 
                    placeholder="Enter states/regions where this product is NOT available (e.g., CA, NY, TX)"
                    className="min-h-[70px] text-base font-medium border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-600">Geographic areas where this product cannot be offered</p>
                </div>
              </div>

              {/* Custom Matching Logic Section */}
              <div className="bg-red-50/50 p-6 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  Advanced Custom Logic
                </h3>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-800">Custom Matching Logic</Label>
                  <Textarea 
                    placeholder="Enter advanced matching criteria using logical operators:
Example: (credit_score >= 700 AND annual_revenue >= 500000) OR (time_in_business >= 24 AND debt_ratio <= 0.3)"
                    className="min-h-[120px] font-mono text-sm border-gray-300 focus:border-red-500 focus:ring-red-500 bg-gray-50"
                  />
                  <div className="bg-gray-100 p-3 rounded text-xs text-gray-700">
                    <strong>Available variables:</strong> credit_score, annual_revenue, time_in_business, debt_ratio, industry, state
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50/50 -mx-6 -mb-6 px-6 pb-6">
              <Button 
                variant="outline" 
                onClick={() => setShowMatchingRulesModal(null)}
                className="h-11 px-6 font-medium"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Matching Rules Updated",
                    description: `Matching rules for ${showMatchingRulesModal.product?.name} have been saved successfully.`,
                    variant: "default"
                  });
                  setShowMatchingRulesModal(null);
                }}
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700 font-medium"
              >
                <Settings className="h-4 w-4 mr-2" />
                Save Rules
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Unified Product Form */}
      {showUnifiedForm && (
        <Dialog open={showUnifiedForm} onOpenChange={setShowUnifiedForm}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedProduct ? 'Edit' : 'Add'} Product</DialogTitle>
            </DialogHeader>
            <UnifiedProductForm
              lenderId={selectedProduct?.lender_id || lenders[0]?.id || ''}
              productId={selectedProduct?.id}
              onSave={() => {
                queryClient.invalidateQueries({ queryKey: ['lender-products'] });
                setShowUnifiedForm(false);
                setSelectedProduct(null);
              }}
              onClose={() => {
                setShowUnifiedForm(false);
                setSelectedProduct(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}


      {/* View Product Modal */}
      <ViewProductModal 
        product={viewingProduct}
        isOpen={showViewProductModal}
        onClose={() => {
          setShowViewProductModal(false);
          setViewingProduct(null);
        }}
        onEdit={(product) => {
          setViewingProduct(null);
          setShowViewProductModal(false);
          setSelectedProduct(product);
          setShowUnifiedForm(true);
        }}
      />
      </div>
    </div>
  );
}