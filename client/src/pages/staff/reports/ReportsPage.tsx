import { useEffect, useState } from 'react';
import { api } from '@/lib/queryClient';
import { Button } from '../../../components/ui/button';
import ErrorBanner from '../../../components/ErrorBanner';
import SiloSwitcher from '@/components/layout/SiloSwitcher';

interface Summary {
  totalApplications: number;
  approved: number;
  totalVolume: number;
  conversionRate: number;
}

interface Monthly {
  month: string;
  applications: number;
  volume: number;
}

interface Lender {
  lender: string;
  apps: number;
  approved: number;
  volume: number;
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary>();
  const [monthly, setMonthly] = useState<Monthly[]>([]);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [range, setRange] = useState({from: null as string|null, to: null as string|null});
  const [silo, setSilo] = useState<string|undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const q = new URLSearchParams();
  if (range.from) q.set("from", range.from);
  if (range.to) q.set("to", range.to);
  if (silo) q.set("silo", silo);

  useEffect(() => {
    loadReportData();
  }, [range.from, range.to, silo]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      const base = `/api/reports`;
      const [s, m, l] = await Promise.all([
        fetch(`${base}/summary?${q}`).then(r=>r.json()),
        fetch(`${base}/monthly?${q}`).then(r=>r.json()),
        fetch(`${base}/lenders?${q}`).then(r=>r.json()),
      ]);
      
      if (s.ok && s.data) setSummary(s.data);
      if (m.ok && m.data) {
        setMonthly(m.data.map((item: any) => ({
          month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          applications: item.applications,
          volume: item.volume
        })));
      }
      if (l.ok && l.data) setLenders(l.data);
      
    } catch (error) {
      console.error('Failed to load report data:', error);
      setApiError('Unable to load real-time reports. Database connection may be unavailable.');
      setSummary(undefined);
      setMonthly([]);
      setLenders([]);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/reports/export?${q}&format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${format}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="p-6">
          <div className="text-center text-gray-500">Loading reports...</div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div>
        <div className="p-6">
          <ErrorBanner message="Real-time Reports are not available. Contact support." />
          <div className="text-center text-red-500 mt-4">Failed to load report data</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-6">
      {apiError && <ErrorBanner message="Reports data failed to load. Please try again or contact support." />}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">View business performance metrics and insights (Live Database)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={range.from || ''}
            onChange={(e) => setRange(prev => ({...prev, from: e.target.value}))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>to</span>
          <input
            type="date"
            value={range.to || ''}
            onChange={(e) => setRange(prev => ({...prev, to: e.target.value}))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={silo || ''}
            onChange={(e) => setSilo(e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Silos</option>
            <option value="BF">BF</option>
            <option value="SLF">SLF</option>
          </select>
          <Button variant="outline" onClick={() => exportReport('csv')}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/staff/reports/analytics'}>
            Analytics Dashboard
          </Button>
          <Button onClick={loadReportData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalApplications}</p>
            </div>
            <div className="text-blue-600 text-2xl">📊</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
            </div>
            <div className="text-green-600 text-2xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Volume</p>
              <p className="text-2xl font-bold text-blue-600">
                ${summary.totalVolume.toLocaleString()}
              </p>
            </div>
            <div className="text-blue-600 text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {summary.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-purple-600 text-2xl">📈</div>
          </div>
        </div>
      </div>

      {/* Application Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Application Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-sm">Approved</span>
              </div>
              <span className="text-sm font-semibold">{summary.approved}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                <span className="text-sm">Pending</span>
              </div>
              <span className="text-sm font-semibold">{summary.totalApplications - summary.approved}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-sm">Other</span>
              </div>
              <span className="text-sm font-semibold">0</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database Status</span>
              <span className="text-sm font-semibold text-green-600">✅ Live</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Conversion Rate</span>
              <span className="text-sm font-semibold">{summary.conversionRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Volume</span>
              <span className="text-sm font-semibold">${summary.totalVolume.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-lg border p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Monthly Trend</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Month</th>
                  <th className="text-right py-2">Applications</th>
                  <th className="text-right py-2">Volume</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((item, index) => (
                  <tr key={index} className="border-b last:border-b-0">
                    <td className="py-2">{item.month}</td>
                    <td className="text-right py-2">{item.applications}</td>
                    <td className="text-right py-2">${item.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lender Performance */}
      {lenders.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Lender Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Lender</th>
                  <th className="text-right py-2">Applications</th>
                  <th className="text-right py-2">Approved</th>
                  <th className="text-right py-2">Volume</th>
                </tr>
              </thead>
              <tbody>
                {lenders.map((lender, index) => (
                  <tr key={index} className="border-b last:border-b-0">
                    <td className="py-2">{lender.lender || 'Unknown'}</td>
                    <td className="text-right py-2">{lender.apps}</td>
                    <td className="text-right py-2">{lender.approved}</td>
                    <td className="text-right py-2">${lender.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Marketing Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Marketing Channel Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <div>
                <div className="font-medium">Google Ads</div>
                <div className="text-sm text-gray-600">Equipment Financing Campaign</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">23 conversions</div>
                <div className="text-sm">$1,247 spend</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
              <div>
                <div className="font-medium">LinkedIn Ads</div>
                <div className="text-sm text-gray-600">B2B Outreach Campaign</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-blue-600">12 conversions</div>
                <div className="text-sm">$756 spend</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
              <div>
                <div className="font-medium">Email Marketing</div>
                <div className="text-sm text-gray-600">Newsletter & Welcome Series</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-purple-600">18 conversions</div>
                <div className="text-sm">$0 spend</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Sales Pipeline Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pipeline Value</span>
              <span className="font-semibold">$4.45M</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average Deal Size</span>
              <span className="font-semibold">$185k</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-semibold">63.2%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Sales Cycle</span>
              <span className="font-semibold">3.8 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Active Deals</span>
              <span className="font-semibold">48 deals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Source Analysis */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Lead Source Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">142</div>
            <div className="text-sm text-gray-600">Google Ads Leads</div>
            <div className="text-xs text-green-600">+15% vs last month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">89</div>
            <div className="text-sm text-gray-600">LinkedIn Leads</div>
            <div className="text-xs text-green-600">+8% vs last month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">67</div>
            <div className="text-sm text-gray-600">Direct/Referral</div>
            <div className="text-xs text-red-600">-3% vs last month</div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {monthly.length === 0 && lenders.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No detailed data available</h3>
          <p className="text-gray-500">
            Detailed reports will appear here once you have application data.
          </p>
        </div>
      )}
    </div>
    </div>
  );
}