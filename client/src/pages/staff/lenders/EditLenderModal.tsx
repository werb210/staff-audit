import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  formatPhoneNumber, 
  isValidPhoneNumber, 
  getPhoneFormatHint,
  normalizePhoneNumber 
} from '@/lib/phoneUtils';

type Lender = {
  id?: string;
  name: string;
  internal_notes?: string;
  is_active: boolean;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  country?: string;
  province_state?: string[];
  mailing_address?: string;
  min_loan_amount?: number;
  max_loan_amount?: number;
  funding_speed?: string;
  preferred_industries?: string[];
  exclusions?: string;
  requires_pdf_submission?: boolean;
  sends_offers_by_email?: boolean;
  signed_agreement_required?: boolean;
  ai_notes?: string;
  submission_method?: string;
  submission_email?: string;
  api_url?: string;
  api_token?: string;
  // Legacy fields for compatibility
  legal_name?: string;
  display_name?: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  country_offered?: string;
  min_amount?: number;
  max_amount?: number;
  notes?: string;
  description?: string;
  tenant?: string;
};

interface EditLenderModalProps {
  lender: Lender | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function EditLenderModal({ lender, isOpen, onClose, onSave }: EditLenderModalProps) {
  const [formData, setFormData] = useState<Lender>({
    name: '',
    internal_notes: '',
    is_active: true,
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    country: 'Canada',
    province_state: [],
    mailing_address: '',
    min_loan_amount: 10000,
    max_loan_amount: 1000000,
    funding_speed: '2-3 Days',
    preferred_industries: [],
    exclusions: '',
    requires_pdf_submission: false,
    sends_offers_by_email: false,
    signed_agreement_required: false,
    ai_notes: '',
    submission_method: 'Email',
    submission_email: '',
    api_url: '',
    api_token: '',
  });

  useEffect(() => {
    if (lender) {
      setFormData({
        ...lender,
        legal_name: lender.legal_name || '',
        display_name: lender.display_name || '',
        company_name: lender.company_name || '',
        contact_email: lender.contact_email || lender.email || '',
        contact_phone: lender.contact_phone || lender.phone || '',
        country_offered: lender.country_offered || lender.country || 'Canada',
        min_loan_amount: lender.min_loan_amount || lender.min_amount || 10000,
        max_loan_amount: lender.max_loan_amount || lender.max_amount || 1000000,
        description: lender.description || '',
        tenant: lender.tenant || 'bf',
      });
    } else {
      setFormData({
        name: '',
        legal_name: '',
        display_name: '',
        company_name: '',
        email: '',
        contact_email: '',
        phone: '',
        contact_phone: '',
        website: '',
        country: 'Canada',
        country_offered: 'Canada',
        min_amount: 10000,
        max_amount: 1000000,
        min_loan_amount: 10000,
        max_loan_amount: 1000000,
        is_active: true,
        notes: '',
        description: '',
        tenant: 'bf',
      });
    }
  }, [lender]);

  const saveMutation = useMutation({
    mutationFn: async (data: Lender) => {
      if (lender?.id) {
        // Update existing lender using canonical API
        return await api(`/api/lenders/${lender.id}`, {
          method: 'PUT',
          body: data,
        });
      } else {
        // Create new lender using canonical API
        return await api('/api/lenders', {
          method: 'POST',
          body: data,
        });
      }
    },
    onSuccess: (result) => {
      onSave();
      onClose();
    },
    onError: (error) => {
      console.error('❌ [LENDER SAVE] Save failed:', error);
      alert('Failed to save lender: ' + (error.message || 'Unknown error'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof Lender, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-2 shadow-xl">
        <DialogHeader>
          <DialogTitle>
            {lender ? 'Edit Lender' : 'Add New Lender'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Basic Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Basic Info</h4>
            <div>
              <Label htmlFor="name">Lender Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Display name of the lender"
                required
              />
            </div>
            <div>
              <Label htmlFor="internal_notes">Internal Notes</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes || ''}
                onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                placeholder="Internal-only details about the lender"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active" className="text-sm">Active / Inactive</Label>
              <span className="text-xs text-gray-500 ml-2">
                Whether the lender is currently available
              </span>
            </div>
          </div>

          {/* Section: Contact Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Contact Info</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name || ''}
                  onChange={(e) => handleInputChange('contact_name', e.target.value)}
                  placeholder="Primary contact at lender"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    handleInputChange('phone', formatted);
                  }}
                  onBlur={(e) => {
                    const normalized = normalizePhoneNumber(e.target.value);
                    handleInputChange('phone', normalized);
                  }}
                  placeholder="+1234567890"
                  className={
                    formData.phone && !isValidPhoneNumber(formData.phone) 
                      ? "border-red-300 focus:border-red-500" 
                      : ""
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Contact email for outreach"
                />
              </div>
              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="Lender's website link"
                />
              </div>
            </div>
          </div>

          {/* Section: Location */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Location</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Select value={formData.country || 'Canada'} onValueChange={(value) => handleInputChange('country', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="Canada" className="text-gray-900 hover:bg-gray-100">Canada</SelectItem>
                    <SelectItem value="USA" className="text-gray-900 hover:bg-gray-100">USA</SelectItem>
                    <SelectItem value="Both" className="text-gray-900 hover:bg-gray-100">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mailing_address">Mailing Address</Label>
                <Input
                  id="mailing_address"
                  value={formData.mailing_address || ''}
                  onChange={(e) => handleInputChange('mailing_address', e.target.value)}
                  placeholder="Optional physical address"
                />
              </div>
            </div>
          </div>

          {/* Section: Lending Preferences */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Lending Preferences</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_loan_amount">Min Loan Amount ($)</Label>
                <Input
                  id="min_loan_amount"
                  type="number"
                  value={formData.min_loan_amount || ''}
                  onChange={(e) => handleInputChange('min_loan_amount', parseInt(e.target.value) || 0)}
                  placeholder="Minimum funding amount"
                />
              </div>
              <div>
                <Label htmlFor="max_loan_amount">Max Loan Amount ($)</Label>
                <Input
                  id="max_loan_amount"
                  type="number"
                  value={formData.max_loan_amount || ''}
                  onChange={(e) => handleInputChange('max_loan_amount', parseInt(e.target.value) || 0)}
                  placeholder="Maximum funding amount"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="funding_speed">Funding Speed</Label>
              <Select value={formData.funding_speed || '2-3 Days'} onValueChange={(value) => handleInputChange('funding_speed', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select funding speed" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="1 Day" className="text-gray-900 hover:bg-gray-100">1 Day</SelectItem>
                  <SelectItem value="2-3 Days" className="text-gray-900 hover:bg-gray-100">2-3 Days</SelectItem>
                  <SelectItem value="1 Week" className="text-gray-900 hover:bg-gray-100">1 Week</SelectItem>
                  <SelectItem value=">1 Week" className="text-gray-900 hover:bg-gray-100">&gt;1 Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="exclusions">Exclusions</Label>
              <Textarea
                id="exclusions"
                value={formData.exclusions || ''}
                onChange={(e) => handleInputChange('exclusions', e.target.value)}
                placeholder="Notes on rejected business types"
                rows={2}
              />
            </div>
          </div>

          {/* Section: Admin & Integration */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Admin & Integration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_pdf_submission"
                  checked={formData.requires_pdf_submission || false}
                  onCheckedChange={(checked) => handleInputChange('requires_pdf_submission', checked)}
                />
                <Label htmlFor="requires_pdf_submission" className="text-sm">Requires PDF Submission</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sends_offers_by_email"
                  checked={formData.sends_offers_by_email || false}
                  onCheckedChange={(checked) => handleInputChange('sends_offers_by_email', checked)}
                />
                <Label htmlFor="sends_offers_by_email" className="text-sm">Sends Offers by Email</Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="signed_agreement_required"
                checked={formData.signed_agreement_required || false}
                onCheckedChange={(checked) => handleInputChange('signed_agreement_required', checked)}
              />
              <Label htmlFor="signed_agreement_required" className="text-sm">Signed Agreement Required</Label>
            </div>
            <div>
              <Label htmlFor="ai_notes">AI Notes</Label>
              <Textarea
                id="ai_notes"
                value={formData.ai_notes || ''}
                onChange={(e) => handleInputChange('ai_notes', e.target.value)}
                placeholder="Internal notes used for AI matching"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="submission_method">Submission Method</Label>
                <Select value={formData.submission_method || 'Email'} onValueChange={(value) => handleInputChange('submission_method', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="Email" className="text-gray-900 hover:bg-gray-100">Email</SelectItem>
                    <SelectItem value="API" className="text-gray-900 hover:bg-gray-100">API</SelectItem>
                    <SelectItem value="Portal" className="text-gray-900 hover:bg-gray-100">Portal</SelectItem>
                    <SelectItem value="Phone" className="text-gray-900 hover:bg-gray-100">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="submission_email">Submission Email</Label>
                <Input
                  id="submission_email"
                  type="email"
                  value={formData.submission_email || ''}
                  onChange={(e) => handleInputChange('submission_email', e.target.value)}
                  placeholder="Email used when method = Email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="api_url">API URL</Label>
                <Input
                  id="api_url"
                  type="url"
                  value={formData.api_url || ''}
                  onChange={(e) => handleInputChange('api_url', e.target.value)}
                  placeholder="API endpoint if applicable"
                />
              </div>
              <div>
                <Label htmlFor="api_token">API Token / Key</Label>
                <Input
                  id="api_token"
                  type="password"
                  value={formData.api_token || ''}
                  onChange={(e) => handleInputChange('api_token', e.target.value)}
                  placeholder="Token used for secure API access"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Lender'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}