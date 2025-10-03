import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Mail, Phone, Globe, MapPin, DollarSign } from 'lucide-react';

interface Lender {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  is_active: boolean;
  min_loan_amount?: number;
  max_loan_amount?: number;
  product_count?: number;
  active_product_count?: number;
  tenant?: string;
  internal_notes?: string;
  contact_name?: string;
  mailing_address?: string;
  funding_speed?: string;
  exclusions?: string;
  submission_method?: string;
  submission_email?: string;
}

interface ViewLenderModalProps {
  lender: Lender | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lender: Lender) => void;
}

export default function ViewLenderModal({ lender, isOpen, onClose, onEdit }: ViewLenderModalProps) {
  
  if (!lender) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lender Details</DialogTitle>
          </DialogHeader>
          <div className="py-4">No lender data available</div>
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {lender.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status and Basic Info */}
          <div className="flex items-center gap-3">
            <Badge variant={lender.is_active ? "default" : "secondary"}>
              {lender.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">{lender.tenant}</Badge>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {lender.contact_name && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Contact:</span>
                  <span className="text-sm">{lender.contact_name}</span>
                </div>
              )}
              {lender.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${lender.email}`} className="text-sm text-blue-600 hover:underline">
                    {lender.email}
                  </a>
                </div>
              )}
              {lender.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${lender.phone}`} className="text-sm text-blue-600 hover:underline">
                    {lender.phone}
                  </a>
                </div>
              )}
              {lender.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a href={lender.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {lender.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {(lender.country || lender.mailing_address) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Location</h3>
              <div className="space-y-2">
                {lender.country && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{lender.country}</span>
                  </div>
                )}
                {lender.mailing_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className="text-sm">{lender.mailing_address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lending Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Lending Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Products:</span>
                  <span className="text-sm">{lender.product_count || 0} total ({lender.active_product_count || 0} active)</span>
                </div>
                {(lender.min_loan_amount || lender.max_loan_amount) && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {lender.min_loan_amount ? formatCurrency(lender.min_loan_amount) : '$0'} - {lender.max_loan_amount ? formatCurrency(lender.max_loan_amount) : 'No limit'}
                    </span>
                  </div>
                )}
              </div>
              {lender.funding_speed && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Funding Speed:</span>
                    <span className="text-sm">{lender.funding_speed}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submission Details */}
          {(lender.submission_method || lender.submission_email) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Submission Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {lender.submission_method && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Method:</span>
                    <span className="text-sm">{lender.submission_method}</span>
                  </div>
                )}
                {lender.submission_email && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Submission Email:</span>
                    <a href={`mailto:${lender.submission_email}`} className="text-sm text-blue-600 hover:underline">
                      {lender.submission_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {(lender.internal_notes || lender.exclusions) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Notes</h3>
              <div className="space-y-3">
                {lender.internal_notes && (
                  <div>
                    <span className="text-sm font-medium block">Internal Notes:</span>
                    <div className="bg-gray-50 rounded-md p-3 mt-1">
                      <p className="text-sm text-gray-700">{lender.internal_notes}</p>
                    </div>
                  </div>
                )}
                {lender.exclusions && (
                  <div>
                    <span className="text-sm font-medium block">Exclusions:</span>
                    <div className="bg-red-50 rounded-md p-3 mt-1">
                      <p className="text-sm text-red-700">{lender.exclusions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onEdit(lender)}>
            Edit Lender
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}