import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Eye, Users, DollarSign, Calendar } from 'lucide-react';
import { useLenderAuth } from '../auth/LenderAuthProvider';

interface ReportsData {
  totalProducts: number;
  activeProducts: number;
  totalViews: number;
  totalApplications: number;
  approvalRate: number;
  avgLoanAmount: number;
  monthlyStats: {
    month: string;
    applications: number;
    approvals: number;
    volume: number;
  }[];
}

export function Reports() {
  const { token } = useLenderAuth();

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['lender-reports'],
    queryFn: async (): Promise<ReportsData> => {
      if (!token) {
        throw new Error('No authentication token');
      }
      
      const response = await fetch('/lender-portal/api/reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch reports');
      }

      return response.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Reports</h2>
          <p className="text-red-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const stats = [
    {
      title: 'Total Products',
      value: reports?.totalProducts || 0,
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Products',
      value: reports?.activeProducts || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Views',
      value: reports?.totalViews || 0,
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Applications',
      value: reports?.totalApplications || 0,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600">Track your lending product performance and metrics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-md ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{stat.title}</dt>
                      <dd className="text-lg font-medium text-gray-900">{stat.value.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Average Loan Amount</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(reports?.avgLoanAmount || 0)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Average amount across all approved applications
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Approval Rate</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatPercentage(reports?.approvalRate || 0)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Percentage of applications approved
          </p>
        </div>
      </div>

      {/* Monthly Trends */}
      {reports?.monthlyStats && reports.monthlyStats.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Monthly Performance</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applications
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approvals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Volume
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approval Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.monthlyStats.map((stat, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stat.month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.applications}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.approvals}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(stat.volume)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.applications > 0 ? formatPercentage(stat.approvals / stat.applications) : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {(!reports?.monthlyStats || reports.monthlyStats.length === 0) && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-6">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No performance data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Performance data will appear here once you start receiving applications.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}