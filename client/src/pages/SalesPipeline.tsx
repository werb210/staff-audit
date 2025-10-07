// client/src/pages/SalesPipeline.tsx
import React, { useState } from 'react';

const tabs = [
  'Application',
  'Financials',
  'Banking Analysis',
  'Credit Summary',
  'Documents',
  'Notes',
  'Lender Matching',
] as const;

const SalesPipeline: React.FC = () => {
  const [active, setActive] = useState<typeof tabs[number]>(tabs[0]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Sales Pipeline</h1>
      <div className="flex space-x-4 border-b mb-4">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`py-2 px-3 ${active === tab ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4 border rounded-md bg-white">
        {active === 'Application' && (
          <div>
            {/* Example of red-text discrepancy highlighting */}
            <p>
              <span className="text-red-600">Discrepancy: declared income does not match bank deposits.</span>
            </p>
            {/* TODO: Add rest of Application form data */}
          </div>
        )}
        {active === 'Documents' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Uploaded Documents</h2>
            {/* TODO: List documents pulled from S3. Provide Accept/Reject actions. */}
          </div>
        )}
        {/* Add other tabs similarly */}
      </div>
    </div>
  );
};

export default SalesPipeline;
