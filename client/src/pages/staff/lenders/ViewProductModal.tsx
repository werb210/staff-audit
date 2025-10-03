import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Building2, DollarSign, Percent, Calendar, Globe } from 'lucide-react';

interface LenderProduct {
  id: string;
  lender_id: string;
  lender_name?: string;
  name: string;
  category: string;
  country?: string;
  min_amount: number;
  max_amount: number;
  rate_min?: number;
  rate_max?: number;
  term_min?: number;
  term_max?: number;
  active: boolean;
  fees?: string;
  eligibility?: string;
  data?: {
    required_docs?: string[];
  };
  updated_at?: string;
  description?: string;
}

interface ViewProductModalProps {
  product: LenderProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: LenderProduct) => void;
}

export default function ViewProductModal({ product, isOpen, onClose, onEdit }: ViewProductModalProps) {
  
  if (!product) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          <div className="py-4">No product data available</div>
        </DialogContent>
      </Dialog>
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status and Basic Info */}
          <div className="flex items-center gap-3">
            <Badge variant={product.active ? "default" : "secondary"}>
              {product.active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">{product.category}</Badge>
            {product.country && (
              <Badge variant="outline">{product.country}</Badge>
            )}
          </div>

          {/* Lender Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Lender Information</h3>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">{product.lender_name}</span>
            </div>
          </div>

          {/* Financial Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Financial Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-sm font-medium block">Loan Amount</span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(product.min_amount ?? product.minAmount ?? product.minimumLendingAmount ?? 0)} – {formatCurrency(product.max_amount ?? product.maxAmount ?? product.maximumLendingAmount ?? 0)}
                  </span>
                </div>
              </div>
              
              {product.rate_min && (
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium block">Interest Rate</span>
                    <span className="text-sm text-gray-600">
                      {formatRate(product.rate_min, product.rate_max)}
                    </span>
                  </div>
                </div>
              )}

              {product.term_min && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium block">Term Length</span>
                    <span className="text-sm text-gray-600">
                      {formatTerm(product.term_min, product.term_max)}
                    </span>
                  </div>
                </div>
              )}

              {product.country && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium block">Available in</span>
                    <span className="text-sm text-gray-600">{product.country}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Description */}
          {product.description && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Description</h3>
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-sm text-gray-700">{product.description}</p>
              </div>
            </div>
          )}

          {/* Fees and Eligibility */}
          {(product.fees || product.eligibility) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
              <div className="space-y-3">
                {product.fees && (
                  <div>
                    <span className="text-sm font-medium block">Fees</span>
                    <div className="bg-yellow-50 rounded-md p-3 mt-1">
                      <p className="text-sm text-yellow-800">{product.fees}</p>
                    </div>
                  </div>
                )}
                {product.eligibility && (
                  <div>
                    <span className="text-sm font-medium block">Eligibility Requirements</span>
                    <div className="bg-blue-50 rounded-md p-3 mt-1">
                      <p className="text-sm text-blue-800">{product.eligibility}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Required Documents */}
          {product.data?.required_docs && product.data.required_docs.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Required Documents</h3>
              <div className="grid grid-cols-2 gap-2">
                {product.data.required_docs.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    {doc}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {product.updated_at && (
            <div className="text-xs text-gray-500 pt-4 border-t">
              Last updated: {new Date(product.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onEdit(product)}>
            Edit Product
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}