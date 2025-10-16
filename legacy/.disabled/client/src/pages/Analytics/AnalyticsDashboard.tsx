import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  DollarSign, 
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface KPI {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}

export default function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Fetch KPIs
  const { data: kpisData, isLoading: kpisLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard/kpis', selectedPeriod],
    staleTime: 60000, // 1 minute
  });

  // Fetch Performance Data
  const { data: performanceData, isLoading: perfLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard/performance'],
    staleTime: 30000, // 30 seconds
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat().format(value);
  };

  const getKPICards = (): KPI[] => {
    if (!kpisData) return [];

    return [
      {
        label: 'Total Applications',
        value: formatNumber(kpisData.totals?.apps_created || 0),
        icon: <FileText size={24} className="text-blue-500" />,
        trend: 'up'
      },
      {
        label: 'New Leads',
        value: formatNumber(kpisData.totals?.leads_new || 0),
        icon: <Users size={24} className="text-green-500" />,
        trend: 'up'
      },
      {
        label: 'Funded Amount',
        value: formatCurrency(kpisData.totals?.funded_amount || 0),
        icon: <DollarSign size={24} className="text-emerald-500" />,
        trend: 'up'
      },
      {
        label: 'Conversion Rate',
        value: `${kpisData.metrics?.conversionRate || 0}%`,
        icon: <TrendingUp size={24} className="text-purple-500" />,
        trend: kpisData.metrics?.conversionRate > 10 ? 'up' : 'stable'
      },
      {
        label: 'Messages Today',
        value: formatNumber(kpisData.realTime?.messages_today || 0),
        icon: <MessageSquare size={24} className="text-cyan-500" />,
        trend: 'stable'
      },
      {
        label: 'Avg Daily Apps',
        value: kpisData.metrics?.avgDailyApplications || 0,
        icon: <Clock size={24} className="text-orange-500" />,
        trend: 'stable'
      }
    ];
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp size={16} className="text-green-500" />;
      case 'down': return <TrendingDown size={16} className="text-red-500" />;
      default: return null;
    }
  };

  if (kpisLoading || perfLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Business performance insights and KPIs</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getKPICards().map((kpi, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{kpi.value}</p>
              </div>
              <div className="flex flex-col items-end">
                {kpi.icon}
                {getTrendIcon(kpi.trend)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Section */}
      {performanceData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Processing Performance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              Processing Performance
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Processing Rate</span>
                <span className="text-lg font-semibold">{performanceData.processing?.rate}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${performanceData.processing?.rate}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-orange-500">{performanceData.processing?.pending}</p>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{performanceData.processing?.processed}</p>
                  <p className="text-xs text-gray-600">Processed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">{performanceData.processing?.total}</p>
                  <p className="text-xs text-gray-600">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-blue-500" />
              Today's Activity
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-purple-500" />
                  <span className="text-sm text-gray-600">Documents Uploaded</span>
                </div>
                <span className="text-lg font-semibold">{performanceData.activity?.documentsToday}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare size={16} className="text-cyan-500" />
                  <span className="text-sm text-gray-600">Messages Sent</span>
                </div>
                <span className="text-lg font-semibold">{performanceData.activity?.messagesToday}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-orange-500" />
                  <span className="text-sm text-gray-600">Pending Requests</span>
                </div>
                <span className="text-lg font-semibold">{performanceData.activity?.pendingRequests}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-green-500" />
                    <span className="text-sm text-gray-600">Active Lenders</span>
                  </div>
                  <span className="text-lg font-semibold">{performanceData.capacity?.lenders}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Export Report
          </button>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            Send Summary
          </button>
          <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            Schedule Report
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            View Detailed Analytics
          </button>
        </div>
      </div>
    </div>
  );
}