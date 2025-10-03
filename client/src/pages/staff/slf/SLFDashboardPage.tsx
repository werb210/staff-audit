import React from 'react';
import SiloSwitcher from '@/components/layout/SiloSwitcher';
import { useSilo } from '@/shell/silo';

export default function SLFDashboardPage() {
  const { silo } = useSilo();
  
  // Show loading state while silo switches to prevent React hooks errors
  if (silo !== 'slf') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-blue-600">🔄 Switching to SLF silo...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-600">
            🔵 SLF (Site Level Financial) - DASHBOARD
          </h2>
          <SiloSwitcher />
        </div>
      </div>
      
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">SLF Dashboard</h3>
          <p className="text-blue-600">
            Site Level Financial dashboard with independent data and metrics.
            This page is completely isolated from Boreal Financial (BF) data.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">$2.4M</div>
            <div className="text-sm text-blue-500">Total Portfolio Value</div>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">156</div>
            <div className="text-sm text-blue-500">Active Clients</div>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">94.2%</div>
            <div className="text-sm text-blue-500">Client Satisfaction</div>
          </div>
        </div>
      </div>
    </div>
  );
}