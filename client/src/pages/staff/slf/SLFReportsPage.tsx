import React from 'react';
import SiloSwitcher from '@/components/layout/SiloSwitcher';

export default function SLFReportsPage() {
  
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-600">
            🔵 SLF (Site Level Financial) - REPORTS
          </h2>
          <SiloSwitcher />
        </div>
      </div>
      
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">SLF Reports & Analytics</h3>
          <p className="text-blue-600">
            Site Level Financial reporting dashboard with independent analytics.
            All data is isolated from Boreal Financial (BF) systems.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-700 mb-4">Monthly Performance</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-600">New Applications</span>
                <span className="font-semibold text-blue-800">47</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Approved</span>
                <span className="font-semibold text-green-600">42</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Under Review</span>
                <span className="font-semibold text-yellow-600">5</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-700 mb-4">Client Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-600">Active Clients</span>
                <span className="font-semibold text-blue-800">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">New This Month</span>
                <span className="font-semibold text-green-600">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Retention Rate</span>
                <span className="font-semibold text-blue-800">96.8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}