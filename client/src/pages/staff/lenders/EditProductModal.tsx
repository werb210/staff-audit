import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type LenderProduct = {
  id?: string;
  lenderId: string;
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
  isActive: boolean;
  description?: string;
};

type Lender = {
  id: string;
  name: string;
  company_name: string;
};

interface EditProductModalProps {
  product: LenderProduct | null;
  lenders: Lender[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function EditProductModal({ product, lenders, isOpen, onClose, onSave }: EditProductModalProps) {
  const [formData, setFormData] = useState<LenderProduct>({
    lenderId: '',
    productName: '',
    productCategory: '',
    countryOffered: 'CA',
    minimumLendingAmount: 0,
    maximumLendingAmount: 0,
    interestRateMinimum: 0,
    interestRateMaximum: 0,
    termMinimum: 0,
    termMaximum: 0,
    documentsRequired: [],
    isActive: true,
    description: '',
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        lenderId: '',
        productName: '',
        productCategory: '',
        countryOffered: 'CA',
        minimumLendingAmount: 0,
        maximumLendingAmount: 0,
        interestRateMinimum: 0,
        interestRateMaximum: 0,
        termMinimum: 0,
        termMaximum: 0,
        documentsRequired: [],
        isActive: true,
        description: '',
      });
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: async (data: LenderProduct) => {
      if (product?.id) {
        // Update existing product using v1 API
        return api(`/api/v1/lenders/products/${product.id}`, {
          method: 'PUT',
          body: data,
        });
      } else {
        // Create new product using v1 API
        return api('/api/v1/lenders/products', {
          method: 'POST',
          body: data,
        });
      }
    },
    onSuccess: () => {
      onSave();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lenderId) {
      alert('Please select a lender');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof LenderProduct, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-2 shadow-xl">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lenderId">Lender</Label>
              <Select value={formData.lenderId} onValueChange={(value) => handleInputChange('lenderId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lender" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {lenders.map((lender) => (
                    <SelectItem key={lender.id} value={lender.id} className="text-gray-900 hover:bg-gray-100">
                      {lender.company_name || lender.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => handleInputChange('productName', e.target.value)}
                placeholder="Business Term Loan"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productCategory">Category</Label>
              <Select value={formData.productCategory} onValueChange={(value) => handleInputChange('productCategory', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="business_loan" className="text-gray-900 hover:bg-gray-100">Business Loan</SelectItem>
                  <SelectItem value="equipment_financing" className="text-gray-900 hover:bg-gray-100">Equipment Financing</SelectItem>
                  <SelectItem value="line_of_credit" className="text-gray-900 hover:bg-gray-100">Line of Credit</SelectItem>
                  <SelectItem value="invoice_factoring" className="text-gray-900 hover:bg-gray-100">Invoice Factoring</SelectItem>
                  <SelectItem value="merchant_cash_advance" className="text-gray-900 hover:bg-gray-100">Merchant Cash Advance</SelectItem>
                  <SelectItem value="real_estate" className="text-gray-900 hover:bg-gray-100">Real Estate</SelectItem>
                  <SelectItem value="sba_loan" className="text-gray-900 hover:bg-gray-100">SBA Loan</SelectItem>
                  <SelectItem value="other" className="text-gray-900 hover:bg-gray-100">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="countryOffered">Country Offered</Label>
              <Input
                id="countryOffered"
                value={formData.countryOffered}
                onChange={(e) => handleInputChange('countryOffered', e.target.value)}
                placeholder="CA"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minimumLendingAmount">Minimum Amount ($)</Label>
              <Input
                id="minimumLendingAmount"
                type="number"
                value={formData.minimumLendingAmount}
                onChange={(e) => handleInputChange('minimumLendingAmount', parseInt(e.target.value) || 0)}
                placeholder="10000"
              />
            </div>
            <div>
              <Label htmlFor="maximumLendingAmount">Maximum Amount ($)</Label>
              <Input
                id="maximumLendingAmount"
                type="number"
                value={formData.maximumLendingAmount}
                onChange={(e) => handleInputChange('maximumLendingAmount', parseInt(e.target.value) || 0)}
                placeholder="1000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="interestRateMinimum">Minimum Rate (%)</Label>
              <Input
                id="interestRateMinimum"
                type="number"
                step="0.01"
                value={formData.interestRateMinimum}
                onChange={(e) => handleInputChange('interestRateMinimum', parseFloat(e.target.value) || 0)}
                placeholder="5.5"
              />
            </div>
            <div>
              <Label htmlFor="interestRateMaximum">Maximum Rate (%)</Label>
              <Input
                id="interestRateMaximum"
                type="number"
                step="0.01"
                value={formData.interestRateMaximum}
                onChange={(e) => handleInputChange('interestRateMaximum', parseFloat(e.target.value) || 0)}
                placeholder="18.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="termMinimum">Minimum Term (months)</Label>
              <Input
                id="termMinimum"
                type="number"
                value={formData.termMinimum}
                onChange={(e) => handleInputChange('termMinimum', parseInt(e.target.value) || 0)}
                placeholder="6"
              />
            </div>
            <div>
              <Label htmlFor="termMaximum">Maximum Term (months)</Label>
              <Input
                id="termMaximum"
                type="number"
                value={formData.termMaximum}
                onChange={(e) => handleInputChange('termMaximum', parseInt(e.target.value) || 0)}
                placeholder="60"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Product description and requirements..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <Label htmlFor="isActive">Active Product</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}