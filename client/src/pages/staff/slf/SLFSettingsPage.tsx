import React from 'react';
import SiloSwitcher from '@/components/layout/SiloSwitcher';

export default function SLFSettingsPage() {
  
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-600">
            🔵 SLF (Site Level Financial) - SETTINGS
          </h2>
          <SiloSwitcher />
        </div>
      </div>
      
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">SLF System Configuration</h3>
          <p className="text-blue-600">
            Site Level Financial settings and configuration panel.
            All settings are completely independent from Boreal Financial (BF).
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-700 mb-4">SLF Account Settings</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-blue-700">External API Integration</div>
                  <div className="text-sm text-blue-500">Configure SLF external data source</div>
                </div>
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                  Configure
                </button>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-blue-700">Data Synchronization</div>
                  <div className="text-sm text-blue-500">Sync frequency and options</div>
                </div>
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                  Configure
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-700 mb-4">System Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-600">API Status</span>
                <span className="font-semibold text-green-600">✅ Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Data Sync</span>
                <span className="font-semibold text-green-600">✅ Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Last Update</span>
                <span className="font-semibold text-blue-800">2 min ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}