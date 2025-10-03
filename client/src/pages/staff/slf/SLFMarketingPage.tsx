import React from 'react';
import SiloSwitcher from '@/components/layout/SiloSwitcher';

export default function SLFMarketingPage() {
  
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-600">
            🔵 SLF (Site Level Financial) - MARKETING
          </h2>
          <SiloSwitcher />
        </div>
      </div>
      
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">SLF Marketing Center</h3>
          <p className="text-blue-600">
            Site Level Financial marketing campaigns and lead generation.
            Completely separate from Boreal Financial (BF) marketing activities.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-700 mb-4">Active Campaigns</h4>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="font-medium text-blue-700">SLF Equipment Financing</div>
                <div className="text-sm text-blue-500">Google Ads • Active • $2,400 budget</div>
                <div className="text-sm text-green-600">47 leads this month</div>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="font-medium text-blue-700">Site Level Direct Mail</div>
                <div className="text-sm text-blue-500">Direct Marketing • Active • 1,200 pieces</div>
                <div className="text-sm text-green-600">23 responses</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-700 mb-4">Performance Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-600">Total Leads</span>
                <span className="font-semibold text-blue-800">94</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Conversion Rate</span>
                <span className="font-semibold text-green-600">18.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Cost per Lead</span>
                <span className="font-semibold text-blue-800">$67</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">ROI</span>
                <span className="font-semibold text-green-600">284%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}