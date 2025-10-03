import React from "react";
import { cardFields } from './_canonCardFields';

export type PipelineCardType = {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  amount?: number | null;
  createdAt?: string | null;
  status?: string;
  // Enhanced fields
  contactPhone?: string | null;
  businessType?: string | null;
  industry?: string | null;
  annualRevenue?: number | null;
  yearsInBusiness?: number | null;
  numberOfEmployees?: number | null;
  businessAddress?: string | null;
  website?: string | null;
  lenderId?: string | null;
  productId?: string | null;
  useOfFunds?: string | null;
  // Document information
  documentCount?: number;
  documentsUploaded?: Array<{
    id: string;
    fileName: string;
    documentType: string;
    status: string;
    uploadedAt: string;
    fileSize?: number;
  }>;
  missingDocuments?: string[];
};

export function PipelineCard({
  c,
  onOpen,
}: {
  c: PipelineCardType;
  onOpen: (c: PipelineCardType) => void;
  onMove?: (c: PipelineCardType, next: string) => void;
}) {
  const f = cardFields(c);
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpen(c);
  };

  return (
    <div
      className="border rounded p-3 mb-2 bg-white hover:shadow cursor-pointer transition-shadow relative"
      data-testid="pipeline-card"
      onClick={handleCardClick}
      style={{ 
        userSelect: 'none',
        zIndex: 10,
        pointerEvents: 'auto'
      }}
    >
      {/* Header with name and status */}
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="font-semibold truncate text-base">{f.businessName || "—"}</div>
        <span className={`text-xs rounded px-2 py-0.5 border ${
          c.status === 'funded' ? 'bg-green-100 text-green-800' :
          c.status === 'approved' ? 'bg-blue-100 text-blue-800' :
          c.status === 'qualified' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-50 text-gray-600'
        }`}>
          {c.status || "new"}
        </span>
      </div>

      {/* Company and contact info */}
      <div className="text-sm text-gray-700 mb-2">
        <div className="truncate">
          <strong>{f.businessName || "—"}</strong>
        </div>
        <div className="text-xs text-gray-600 flex gap-2">
          <span>{f.email || "—"}</span>
          {f.contactPhone && <span>• {f.contactPhone}</span>}
        </div>
      </div>

      {/* Business details */}
      <div className="text-xs space-y-1 mb-2">
        {f.industry && (
          <div><b>Industry:</b> {f.industry}</div>
        )}
        {f.businessType && (
          <div><b>Type:</b> {f.businessType}</div>
        )}
        {f.annualRevenue && (
          <div><b>Annual Revenue:</b> ${Number(f.annualRevenue).toLocaleString()}</div>
        )}
        {f.yearsInBusiness && (
          <div><b>Years in Business:</b> {f.yearsInBusiness}</div>
        )}
        {f.numberOfEmployees && (
          <div><b>Employees:</b> {f.numberOfEmployees}</div>
        )}
        {f.businessAddress && (
          <div><b>Address:</b> <span className="truncate">{f.businessAddress}</span></div>
        )}
        {f.website && (
          <div><b>Website:</b> <span className="truncate">{f.website}</span></div>
        )}
        {f.useOfFunds && (
          <div><b>Use of Funds:</b> <span className="truncate">{f.useOfFunds}</span></div>
        )}
      </div>

      {/* Loan amount and created date */}
      <div className="text-xs flex justify-between items-center mb-2 pt-1 border-t">
        <div>
          <b>Amount:</b> {f.requestedAmount != null ? `$${Number(f.requestedAmount).toLocaleString()}` : "—"}
        </div>
        <div>
          <b>Created:</b> {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
        </div>
      </div>

      {/* Document status */}
      <div className="text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${
              (c.documentCount || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {c.documentCount || 0} docs
            </span>
            {c.missingDocuments && c.missingDocuments.length > 0 && (
              <span className="text-red-600">Missing: {c.missingDocuments.length}</span>
            )}
          </div>
        </div>
        
        {/* Show uploaded documents preview */}
        {c.documentsUploaded && c.documentsUploaded.length > 0 && (
          <div className="mt-1 text-gray-600">
            <div className="text-xs font-medium mb-1">Recent docs:</div>
            <div className="space-y-0.5">
              {c.documentsUploaded.slice(0, 3).map(doc => (
                <div key={doc.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">{doc.fileName}</span>
                  <span className={`ml-1 px-1 rounded text-xs ${
                    doc.status === 'verified' ? 'bg-green-100 text-green-700' :
                    doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
              {c.documentsUploaded.length > 3 && (
                <div className="text-xs text-gray-500">+{c.documentsUploaded.length - 3} more</div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Open Button */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <button 
          onClick={handleCardClick}
          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Open Details
        </button>
      </div>
    </div>
  );
}