import { useState, useMemo } from 'react';
import { Search, Building2, Filter, Check } from 'lucide-react';
import { useLenderCatalog } from '@/hooks/useLenderCatalog';
import { lower } from '@/lib/dedupe';

interface LenderCatalogTableProps {
  className?: string;
}

export default function LenderCatalogTable({ className = '' }: LenderCatalogTableProps) {
  const { data, isLoading, error } = useLenderCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState<'all' | 'CA' | 'US'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!data?.products) return [];
    const unique = [...new Set(data.products.map(p => p.category))];
    return unique.sort();
  }, [data?.products]);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    
    return data.products.filter(product => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        lower(product.name).includes(lower(searchTerm)) ||
        lower(product.lender_name).includes(lower(searchTerm)) ||
        lower(product.category).includes(lower(searchTerm));
      
      // Country filter
      const matchesCountry = countryFilter === 'all' || product.country === countryFilter;
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      
      return matchesSearch && matchesCountry && matchesCategory;
    });
  }, [data?.products, searchTerm, countryFilter, categoryFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCountryFlag = (country: string) => {
    return country === 'CA' ? '🇨🇦' : '🇺🇸';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Equipment Financing': return '🏭';
      case 'Business Line of Credit': return '💳';
      case 'Term Loan': return '🏦';
      case 'Invoice Factoring': return '📄';
      case 'Purchase Order Financing': return '📋';
      case 'Working Capital': return '💰';
      default: return '💼';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading lender catalog...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border p-8 ${className}`}>
        <div className="text-center text-red-600">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-red-300" />
          <h3 className="text-lg font-medium mb-2">Failed to Load Catalog</h3>
          <p>Unable to fetch lender catalog data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header with filters */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Lender Product Catalog</h2>
            <p className="text-sm text-gray-600 mt-1">
              {data?.total || 0} products available • {filteredProducts.length} displayed
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Check className="h-4 w-4 text-green-500" />
            Real-time data
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, lenders, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value as 'all' | 'CA' | 'US')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Countries</option>
              <option value="CA">🇨🇦 Canada</option>
              <option value="US">🇺🇸 United States</option>
            </select>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryIcon(category)} {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product & Lender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documents
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.lender_name}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getCountryFlag(product.country)}</span>
                      <span className="text-sm text-gray-900">{product.country}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getCategoryIcon(product.category)}</span>
                      <span className="text-sm text-gray-900">{product.category}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(product.min_amount)} - {formatCurrency(product.max_amount)}
                    </div>
                    {(product.interest_rate_min !== null || product.interest_rate_max !== null) && (
                      <div className="text-xs text-gray-500">
                        Rate: {product.interest_rate_min ?? 'N/A'} - {product.interest_rate_max ?? 'N/A'}%
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600">
                      {product.required_documents.map((doc) => (
                        <div key={doc.key} className="truncate max-w-xs">
                          {doc.label}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      {filteredProducts.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              Showing {filteredProducts.length} of {data?.total || 0} products
            </div>
            <div className="flex gap-4">
              <span>CA: {filteredProducts.filter(p => p.country === 'CA').length}</span>
              <span>US: {filteredProducts.filter(p => p.country === 'US').length}</span>
              <span>Active: {filteredProducts.filter(p => p.active).length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}