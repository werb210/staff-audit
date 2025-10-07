// client/src/pages/PipelinePage.tsx
import React, { useState } from 'react';

const TABS = [
  'Application',
  'Financials',
  'Banking Analysis',
  'Credit Summary',
  'Documents',
  'Notes',
  'Lender Matching',
];

const PipelinePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Sales Pipeline</h1>
      <div className="flex space-x-2 mb-4">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-3 py-1 rounded ${
            activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          {tab}
        </button>
      ))}
      </div>
      <div className="p-4 border rounded bg-gray-50">
        {activeTab === 'Documents' ? (
          <p>Document management will live here.</p>
        ) : (
          <p>{activeTab} content coming soon.</p>
        )}
      </div>
    </div>
  );
};

export default PipelinePage;
