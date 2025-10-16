import React from 'react';
import { BarChart3, TrendingUp, FileText, Download, Calendar, Filter } from 'lucide-react';

export default function Reports() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">Analytics and reporting dashboard</p>
      </div>

      {/* Report Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Report Filters</h2>
          <div className="flex gap-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>Last Year</option>
              <option>Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>All Reports</option>
              <option>Applications</option>
              <option>Revenue</option>
              <option>Lender Performance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>All Statuses</option>
              <option>Approved</option>
              <option>Pending</option>
              <option>Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lender</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>All Lenders</option>
              <option>Capital One</option>
              <option>Wells Fargo</option>
              <option>Chase Bank</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">847</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm font-medium">+18.2%</span>
            <span className="text-gray-600 text-sm ml-2">vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approval Rate</p>
              <p className="text-2xl font-bold text-gray-900">73.2%</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm font-medium">+5.1%</span>
            <span className="text-gray-600 text-sm ml-2">vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
              <p className="text-2xl font-bold text-gray-900">4.2 days</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm font-medium">-0.8 days</span>
            <span className="text-gray-600 text-sm ml-2">vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">$284K</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm font-medium">+22.8%</span>
            <span className="text-gray-600 text-sm ml-2">vs last period</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Application Trends
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">January 2025</p>
                <p className="text-sm text-gray-600">289 applications</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600">+15.2%</p>
                <p className="text-sm text-gray-600">vs Dec 2024</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">December 2024</p>
                <p className="text-sm text-gray-600">251 applications</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600">+8.7%</p>
                <p className="text-sm text-gray-600">vs Nov 2024</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">November 2024</p>
                <p className="text-sm text-gray-600">231 applications</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-red-600">-2.1%</p>
                <p className="text-sm text-gray-600">vs Oct 2024</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Lenders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Top Performing Lenders
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Capital One Business</p>
                <p className="text-sm text-gray-600">234 applications</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">89.2%</p>
                <p className="text-sm text-gray-600">approval rate</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Wells Fargo Commercial</p>
                <p className="text-sm text-gray-600">198 applications</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">76.4%</p>
                <p className="text-sm text-gray-600">approval rate</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Chase Business Banking</p>
                <p className="text-sm text-gray-600">156 applications</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">68.9%</p>
                <p className="text-sm text-gray-600">approval rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Reports */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Available Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
            <FileText className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Application Summary</h3>
            <p className="text-sm text-gray-600">Detailed application analytics</p>
          </button>
          
          <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
            <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Revenue Report</h3>
            <p className="text-sm text-gray-600">Financial performance metrics</p>
          </button>
          
          <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
            <BarChart3 className="h-6 w-6 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">Lender Performance</h3>
            <p className="text-sm text-gray-600">Comparative lender analysis</p>
          </button>
        </div>
      </div>
    </div>
  );
}