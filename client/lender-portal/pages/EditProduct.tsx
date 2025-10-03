import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, AlertCircle, Trash2 } from 'lucide-react';
import { useLenderAuth } from '../auth/LenderAuthProvider';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  termMonths: number;
  minAmount: number;
  maxAmount: number;
  status: string;
}

const categories = [
  { value: 'term_loan', label: 'Term Loan' },
  { value: 'line_of_credit', label: 'Line of Credit' },
  { value: 'equipment_financing', label: 'Equipment Financing' },
  { value: 'invoice_factoring', label: 'Invoice Factoring' },
  { value: 'merchant_cash_advance', label: 'Merchant Cash Advance' },
  { value: 'sba_loan', label: 'SBA Loan' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];

export function EditProduct() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { token } = useLenderAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await fetch(`/lender-portal/api/my-products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }

      const product = await response.json();
      setFormData(product);
      return product;
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: Product) => {
      const response = await fetch(`/lender-portal/api/my-products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update product');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      navigate('/products');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/lender-portal/api/my-products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete product');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
      navigate('/products');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Products
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Products
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Error</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Product</h2>
          <p className="text-red-600">{(error as Error)?.message || 'Product not found'}</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      updateProductMutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof Product, value: string | number) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleDelete = () => {
    deleteProductMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Products
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </button>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {(updateProductMutation.error || deleteProductMutation.error) && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">
                    {((updateProductMutation.error || deleteProductMutation.error) as Error).message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input
                type="text"
                id="name"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Term Length */}
            <div>
              <label htmlFor="termMonths" className="block text-sm font-medium text-gray-700">
                Term Length (Months)
              </label>
              <input
                type="number"
                id="termMonths"
                min="1"
                max="360"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.termMonths}
                onChange={(e) => handleChange('termMonths', parseInt(e.target.value))}
              />
            </div>

            {/* Min Amount */}
            <div>
              <label htmlFor="minAmount" className="block text-sm font-medium text-gray-700">
                Minimum Amount ($)
              </label>
              <input
                type="number"
                id="minAmount"
                min="0"
                step="1000"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.minAmount}
                onChange={(e) => handleChange('minAmount', parseInt(e.target.value))}
              />
            </div>

            {/* Max Amount */}
            <div>
              <label htmlFor="maxAmount" className="block text-sm font-medium text-gray-700">
                Maximum Amount ($)
              </label>
              <input
                type="number"
                id="maxAmount"
                min="0"
                step="1000"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.maxAmount}
                onChange={(e) => handleChange('maxAmount', parseInt(e.target.value))}
              />
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProductMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateProductMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Product</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{formData.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteProductMutation.isPending}
                  className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleteProductMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}