/**
 * Attribution Tab - Multi-channel attribution analysis
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { BarChart, LineChart, PieChart, ResponsiveContainer, Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, DollarSign, MousePointer, Eye, Users, Calendar, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AttributionTab() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('30');
  const [selectedContact, setSelectedContact] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['/api/marketing/attribution/report', dateRange],
    staleTime: 30000
  });

  const mockReport = {
    period: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    },
    summary: {
      totalEvents: 2847,
      totalConversions: 84,
      totalRevenue: 420000,
      uniqueContacts: 1456
    },
    channelPerformance: [
      {
        channel: 'google/cpc',
        source: 'google',
        medium: 'cpc',
        events: 1247,
        clicks: 892,
        conversions: 34,
        revenue: 185000,
        uniqueContacts: 456,
        conversionRate: '3.81'
      },
      {
        channel: 'linkedin/social',
        source: 'linkedin',
        medium: 'social',
        events: 687,
        clicks: 445,
        conversions: 18,
        revenue: 125000,
        uniqueContacts: 287,
        conversionRate: '4.04'
      },
      {
        channel: 'email/email',
        source: 'email',
        medium: 'email',
        events: 534,
        clicks: 289,
        conversions: 21,
        revenue: 78000,
        uniqueContacts: 342,
        conversionRate: '7.27'
      },
      {
        channel: 'facebook/social',
        source: 'facebook',
        medium: 'social',
        events: 379,
        clicks: 221,
        conversions: 11,
        revenue: 32000,
        uniqueContacts: 189,
        conversionRate: '4.98'
      }
    ],
    topConvertingPaths: [
      {
        path: 'google/cpc → email/email → direct/none',
        conversions: 12,
        revenue: 67000,
        uniqueContacts: 12,
        avgRevenue: 5583
      },
      {
        path: 'linkedin/social → email/email',
        conversions: 8,
        revenue: 48000,
        uniqueContacts: 8,
        avgRevenue: 6000
      },
      {
        path: 'email/email → google/cpc',
        conversions: 6,
        revenue: 34000,
        uniqueContacts: 6,
        avgRevenue: 5667
      }
    ]
  };

  const currentReport = report || mockReport;

  // Channel performance chart data
  const channelChartData = currentReport.channelPerformance.map(channel => ({
    name: channel.source.charAt(0).toUpperCase() + channel.source.slice(1),
    conversions: channel.conversions,
    revenue: channel.revenue / 1000, // Convert to thousands
    conversionRate: parseFloat(channel.conversionRate)
  }));

  // Revenue by source pie chart data
  const revenueBySourceData = currentReport.channelPerformance.map((channel, index) => ({
    name: channel.source.charAt(0).toUpperCase() + channel.source.slice(1),
    value: channel.revenue,
    percentage: ((channel.revenue / currentReport.summary.totalRevenue) * 100).toFixed(1)
  }));

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attribution Analysis</h2>
          <p className="text-gray-600">Track customer journeys across all channels</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="7" className="text-gray-900 hover:bg-gray-100">Last 7 days</SelectItem>
              <SelectItem value="30" className="text-gray-900 hover:bg-gray-100">Last 30 days</SelectItem>
              <SelectItem value="90" className="text-gray-900 hover:bg-gray-100">Last 90 days</SelectItem>
              <SelectItem value="365" className="text-gray-900 hover:bg-gray-100">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => toast({title: "Export Attribution Report", description: "Attribution report export coming soon"})}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentReport.summary.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-gray-500">All touchpoints</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentReport.summary.totalConversions}</div>
            <p className="text-xs text-gray-500">
              {((currentReport.summary.totalConversions / currentReport.summary.totalEvents) * 100).toFixed(2)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentReport.summary.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">
              ${Math.round(currentReport.summary.totalRevenue / currentReport.summary.totalConversions).toLocaleString()} avg order value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Unique Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentReport.summary.uniqueContacts.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Touched by campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Performance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="conversions" fill="#3B82F6" name="Conversions" />
                <Bar yAxisId="right" dataKey="revenue" fill="#10B981" name="Revenue ($K)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Source Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueBySourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {revenueBySourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Channel</th>
                  <th className="text-left py-3 px-4">Events</th>
                  <th className="text-left py-3 px-4">Clicks</th>
                  <th className="text-left py-3 px-4">Conversions</th>
                  <th className="text-left py-3 px-4">Revenue</th>
                  <th className="text-left py-3 px-4">Conv. Rate</th>
                  <th className="text-left py-3 px-4">Contacts</th>
                </tr>
              </thead>
              <tbody>
                {currentReport.channelPerformance.map((channel, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="font-medium">{channel.channel}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{channel.events.toLocaleString()}</td>
                    <td className="py-3 px-4">{channel.clicks.toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold">{channel.conversions}</td>
                    <td className="py-3 px-4 font-semibold">${channel.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{channel.conversionRate}%</Badge>
                    </td>
                    <td className="py-3 px-4">{channel.uniqueContacts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Converting Paths */}
      <Card>
        <CardHeader>
          <CardTitle>Top Converting Paths</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentReport.topConvertingPaths.map((path, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium mb-1">{path.path}</div>
                  <div className="text-sm text-gray-600">
                    {path.conversions} conversions • {path.uniqueContacts} contacts
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lg">${path.revenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">
                    ${path.avgRevenue.toLocaleString()} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Journey Lookup */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Journey Lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Input
              placeholder="Enter contact ID or email"
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
              className="max-w-md"
            />
            <Button disabled={!selectedContact} onClick={() => toast({title: "View Customer Journey", description: "Contact journey visualization coming soon"})}>
              <Eye className="h-4 w-4 mr-2" />
              View Journey
            </Button>
          </div>
          {!selectedContact && (
            <p className="text-gray-500 text-sm">
              Enter a contact ID or email to see their complete attribution journey
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}