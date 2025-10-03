import React from 'react';
import SiloSwitcher from '@/components/layout/SiloSwitcher';

export default function SLFLendersPage() {
  
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-600">
            🔵 SLF (Site Level Financial) - LENDERS
          </h2>
          <SiloSwitcher />
        </div>
      </div>
      
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">SLF Lending Network</h3>
          <p className="text-blue-600">
            Site Level Financial lender partnerships and product catalog.
            Independent from Boreal Financial (BF) lender network.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-blue-700">SLF Premium Capital</h4>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Active</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-500">Min Amount:</span>
                <span className="font-semibold text-blue-800 ml-2">$50,000</span>
              </div>
              <div>
                <span className="text-blue-500">Max Amount:</span>
                <span className="font-semibold text-blue-800 ml-2">$2,000,000</span>
              </div>
              <div>
                <span className="text-blue-500">Rate:</span>
                <span className="font-semibold text-blue-800 ml-2">8.5% - 14.2%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-blue-700">Site Level Direct</h4>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Active</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-500">Min Amount:</span>
                <span className="font-semibold text-blue-800 ml-2">$25,000</span>
              </div>
              <div>
                <span className="text-blue-500">Max Amount:</span>
                <span className="font-semibold text-blue-800 ml-2">$500,000</span>
              </div>
              <div>
                <span className="text-blue-500">Rate:</span>
                <span className="font-semibold text-blue-800 ml-2">12.0% - 18.5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}