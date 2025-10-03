import { useEffect, useState } from 'react';
import { api } from '@/lib/queryClient';
import { lower } from '@/lib/dedupe';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

interface CallLog {
  id: string;
  contactName: string;
  contactPhone: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'failed' | 'busy';
  duration: number;
  timestamp: string;
  notes?: string;
}

interface CallStats {
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  totalDuration: number;
  avgDuration: number;
}

export default function CallLogPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCallLogs();
    loadCallStats();
  }, [dateFilter]);

  const loadCallLogs = async () => {
    try {
      setLoading(true);
      const response = await api(`/api/communications/call-logs?period=${dateFilter}&search=${searchTerm}`);
      setCalls(response.items || []);
    } catch (error) {
      console.error('Failed to load call logs:', error);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCallStats = async () => {
    try {
      const response = await api(`/api/communications/call-stats?period=${dateFilter}`);
      setStats(response);
    } catch (error) {
      console.error('Failed to load call stats:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'missed': return 'bg-red-100 text-red-700';
      case 'failed': return 'bg-gray-100 text-gray-700';
      case 'busy': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' ? '📞' : '📱';
  };

  const filteredCalls = calls.filter(call =>
    lower(call.contactName).includes(lower(searchTerm)) ||
    call.contactPhone.includes(searchTerm)
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Call Logs</h1>
        <p className="text-gray-600">View and manage call history</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total Calls</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalCalls}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completedCalls}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Missed</div>
            <div className="text-2xl font-bold text-red-600">{stats.missedCalls}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total Duration</div>
            <div className="text-2xl font-bold text-blue-600">{formatDuration(stats.totalDuration)}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Avg Duration</div>
            <div className="text-2xl font-bold text-purple-600">{formatDuration(stats.avgDuration)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
        <Button onClick={loadCallLogs} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Call Logs Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading call logs...
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No call logs found
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{call.contactName}</div>
                        <div className="text-sm text-gray-500">{call.contactPhone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2">{getDirectionIcon(call.direction)}</span>
                        <span className="text-sm text-gray-900 capitalize">{call.direction}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.status)}`}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {call.status === 'completed' ? formatDuration(call.duration) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(call.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {call.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {filteredCalls.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredCalls.length} of {calls.length} calls
        </div>
      )}
    </div>
  );
}