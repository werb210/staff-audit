import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/queryClient';
import { PRODUCT_CATEGORIES } from '../../../constants/requiredDocuments';
import { lower } from '@/lib/dedupe';

interface LenderProduct {
  id: string;
  lenderId: string;
  lenderName?: string;
  country: string;
  category: string;
  minAmount?: number;
  maxAmount?: number;
  requiredDocuments?: string[];
  createdAt: string;
  isNew?: boolean;
}

interface Lender {
  id: string;
  name: string;
  countryCoverage?: string;
}

interface BulkProductsManagerProps {
  products: LenderProduct[];
  lenders: Lender[];
  onClose: () => void;
  onSave: () => void;
}

interface BulkUpdateData {
  products: Array<{
    id?: string;
    lenderId: string;
    country: string;
    category: string;
    minAmount?: number;
    maxAmount?: number;
    requiredDocuments: string[];
    action: 'create' | 'update' | 'delete';
  }>;
}

const CATEGORIES = PRODUCT_CATEGORIES;

export default function BulkProductsManager({ products, lenders, onClose, onSave }: BulkProductsManagerProps) {
  const [editableProducts, setEditableProducts] = useState<LenderProduct[]>(products);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [autoSave, setAutoSave] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter products based on search and filters
  const filteredProducts = editableProducts.filter(product => {
    const matchesSearch = lower(product.lenderName || '').includes(lower(searchTerm)) ||
                         lower(product.category).includes(lower(searchTerm));
    const matchesCountry = !filterCountry || product.country === filterCountry;
    const matchesCategory = !filterCategory || product.category === filterCategory;
    
    return matchesSearch && matchesCountry && matchesCategory;
  });

  // Bulk save mutation
  const bulkSaveMutation = useMutation({
    mutationFn: async (data: BulkUpdateData) => {
      return await api('/api/lender-products/bulk', { 
        method: 'POST', 
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      onSave();
    }
  });

  // CSV import mutation
  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/lender-products/import', {
        method: 'POST',
        body: formData
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.products) {
        setEditableProducts(prev => [...prev, ...data.products]);
      }
    }
  });

  const handleProductChange = (productId: string, field: keyof LenderProduct, value: any) => {
    setEditableProducts(prev => 
      prev.map(product => 
        product.id === productId 
          ? { ...product, [field]: value }
          : product
      )
    );

    if (autoSave) {
      // Implement auto-save logic here
    }
  };

  const handleAddNewRow = () => {
    const newProduct: LenderProduct = {
      id: `new-${Date.now()}`,
      lenderId: '',
      country: 'Canada',
      category: CATEGORIES[0],
      minAmount: undefined,
      maxAmount: undefined,
      requiredDocuments: [],
      createdAt: new Date().toISOString(),
      isNew: true
    };
    setEditableProducts(prev => [newProduct, ...prev]);
  };

  const handleDeleteProduct = (productId: string) => {
    setEditableProducts(prev => prev.filter(product => product.id !== productId));
  };

  const handleBulkSave = () => {
    const changes = editableProducts.map(product => ({
      id: product.isNew ? undefined : product.id,
      lenderId: product.lenderId,
      country: product.country,
      category: product.category,
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
      requiredDocuments: product.requiredDocuments || [],
      action: product.isNew ? 'create' as const : 'update' as const
    }));

    bulkSaveMutation.mutate({ products: changes });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      csvImportMutation.mutate(file);
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkDelete = () => {
    setEditableProducts(prev => 
      prev.filter(product => !selectedProducts.has(product.id))
    );
    setSelectedProducts(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Bulk Products Manager</h2>
            <div className="flex items-center gap-2">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="mr-2"
                />
                Auto-save
              </label>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">All Countries</option>
              <option value="Canada">Canada</option>
              <option value="US">US</option>
            </select>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <button
              onClick={handleAddNewRow}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add Row
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Import CSV
            </button>
            
            {selectedProducts.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete Selected ({selectedProducts.size})
              </button>
            )}
          </div>
        </div>

        {/* Editable Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 w-10">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
                        } else {
                          setSelectedProducts(new Set());
                        }
                      }}
                      checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.id))}
                    />
                  </th>
                  <th className="border p-2 text-left">Lender</th>
                  <th className="border p-2 text-left">Country</th>
                  <th className="border p-2 text-left">Category</th>
                  <th className="border p-2 text-left">Min Amount</th>
                  <th className="border p-2 text-left">Max Amount</th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={product.isNew ? 'bg-blue-50' : ''}>
                    <td className="border p-2">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                      />
                    </td>
                    <td className="border p-2">
                      <select
                        value={product.lenderId}
                        onChange={(e) => handleProductChange(product.id, 'lenderId', e.target.value)}
                        className="w-full p-1 border rounded text-sm"
                      >
                        <option value="">Select Lender</option>
                        {lenders.map(lender => (
                          <option key={lender.id} value={lender.id}>
                            {lender.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border p-2">
                      <select
                        value={product.country}
                        onChange={(e) => handleProductChange(product.id, 'country', e.target.value)}
                        className="w-full p-1 border rounded text-sm"
                      >
                        <option value="Canada">Canada</option>
                        <option value="US">US</option>
                      </select>
                    </td>
                    <td className="border p-2">
                      <select
                        value={product.category}
                        onChange={(e) => handleProductChange(product.id, 'category', e.target.value)}
                        className="w-full p-1 border rounded text-sm"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        value={product.minAmount || ''}
                        onChange={(e) => handleProductChange(product.id, 'minAmount', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full p-1 border rounded text-sm"
                        placeholder="Min"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        value={product.maxAmount || ''}
                        onChange={(e) => handleProductChange(product.id, 'maxAmount', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full p-1 border rounded text-sm"
                        placeholder="Max"
                      />
                    </td>
                    <td className="border p-2">
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No products found. Add a new row or adjust filters.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between">
          <div className="text-sm text-gray-600">
            {filteredProducts.length} products ({editableProducts.filter(p => p.isNew).length} new)
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkSave}
              disabled={bulkSaveMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {bulkSaveMutation.isPending ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>

        {/* Hidden file input for CSV upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}