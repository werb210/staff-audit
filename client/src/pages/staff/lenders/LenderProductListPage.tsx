import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { listLenderProducts, listLenders, createLenderProduct } from '@/features/lenders/actions';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Shield, RefreshCw, Package } from 'lucide-react';
import UnifiedProductForm from './UnifiedProductForm';
import { lower } from '@/lib/dedupe';

type LenderProduct = {
  id: string;
  lenderName: string;
  productName: string;
  productCategory: string;
  countryOffered: string;
  minimumLendingAmount: number;
  maximumLendingAmount: number;
  interestRateMinimum: number;
  interestRateMaximum: number;
  termMinimum: number;
  termMaximum: number;
  documentsRequired: string[];
  description: string;
  updatedAt: string;
  isActive?: boolean;
};

type Lender = {
  id: string;
  name: string;
  company_name: string;
};

export default function LenderProductListPage() {
  const [showUnifiedForm, setShowUnifiedForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{productId?: string, lenderId?: string} | null>(null);

  // New robust loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<LenderProduct[]>([]);
  const [lenders, setLenders] = useState<Lender[]>([]);
  

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const siloItem = localStorage.getItem("silo");
      const silo = siloItem ? lower(siloItem) : undefined;
      
      const [productsResult, lendersResult] = await Promise.all([
        listLenderProducts({ 
          silo,
          limit: 100
        }),
        listLenders({ 
          silo, 
          limit: 100 
        })
      ]);
      setProducts(productsResult);
      setLenders(lendersResult);
    } catch (e: any) {
      setError(e?.message || 'Failed to load products and lenders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/lender-products/${id}`, { 
      method: 'DELETE'}),
    onSuccess: () => {
      loadData(); // Reload data after delete
    },
  });


  function openEdit(product: LenderProduct)  { 
    setSelectedProduct({ productId: product.id, lenderId: product.lenderName });
    setShowUnifiedForm(true);
  }
  function openRules(product: LenderProduct) { 
    // Rules editing functionality placeholder
    console.log('Rules editor for product:', product.id);
  }
  function openCreate() { 
    // For create, we need to select a lender first - use the first available lender for now
    const firstLender = lenders[0];
    if (!firstLender) {
      alert('Please add a lender first');
      return;
    }
    setSelectedProduct({ productId: undefined, lenderId: firstLender.id });
    setShowUnifiedForm(true);
  }

  const handleQuickAddProduct = async () => {
    if (lenders.length === 0) {
      setError('Please add a lender first');
      return;
    }
    try {
      await createLenderProduct({ 
        lenderId: lenders[0].id, 
        name: 'Sample Product ' + Date.now(), 
        rate: 5.75, 
        termMonths: 60, 
        status: 'active' 
      });
      await loadData();
    } catch (error) {
      setError('Failed to create sample product');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  if (loading) return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-gray-600">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading products and lenders...
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="text-red-600 mb-4">⚠️ {error}</div>
      <Button onClick={loadData} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  );

  return (
    <div className="p-6" data-page="lender-product-list">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Lender Products ({products.length})</h1>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2" disabled={lenders.length === 0}>
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>


      {/* Empty state */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          {lenders.length === 0 ? (
            <p className="mb-4">Add a lender first, then create products.</p>
          ) : (
            <>
              <p className="mb-4">Get started by adding your first product.</p>
              <Button onClick={handleQuickAddProduct} variant="outline">
                + Add Sample Product
              </Button>
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Term Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product: LenderProduct) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{product.productName}</div>
                  <div className="text-sm text-gray-500">{product.countryOffered}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.lenderName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.productCategory || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${product.minimumLendingAmount?.toLocaleString() || '0'} - 
                  ${product.maximumLendingAmount?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.interestRateMinimum}% - {product.interestRateMaximum}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.termMinimum} - {product.termMaximum} months
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRules(product)}
                      className="text-green-600 hover:text-green-800"
                      title="Rules"
                    >
                      <Shield className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(product)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No products found. <Button variant="ghost" onClick={openCreate}>Add the first product</Button>
          </div>
        )}
      </div>

      {showUnifiedForm && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <UnifiedProductForm
              lenderId={selectedProduct.lenderId || ""}
              productId={selectedProduct.productId}
              onSave={() => {
                loadData();
                setShowUnifiedForm(false);
                setSelectedProduct(null);
              }}
              onClose={() => {
                setShowUnifiedForm(false);
                setSelectedProduct(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}