import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { 
  Users, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Download,
  Play,
  Pause,
  MoreHorizontal
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface SequencePerformance {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  totalProspects: number;
  connectionsSent: number;
  connectionsAccepted: number;
  messagesSent: number;
  replies: number;
  meetings: number;
  responseRate: number;
  conversionRate: number;
  startDate: string;
  lastActivity: string;
}

export default function LinkedInSequenceReports() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  const [sortBy, setSortBy] = useState('performance');

  // Mock data - in real app, this would come from API
  const sequences: SequencePerformance[] = [
    {
      id: '1',
      name: 'SaaS CEO Outreach',
      status: 'active',
      totalProspects: 150,
      connectionsSent: 120,
      connectionsAccepted: 45,
      messagesSent: 35,
      replies: 12,
      meetings: 3,
      responseRate: 34.3,
      conversionRate: 8.6,
      startDate: '2025-07-15',
      lastActivity: '2 hours ago'
    },
    {
      id: '2',
      name: 'E-commerce Founders',
      status: 'active',
      totalProspects: 200,
      connectionsSent: 180,
      connectionsAccepted: 72,
      messagesSent: 68,
      replies: 18,
      meetings: 5,
      responseRate: 26.5,
      conversionRate: 7.4,
      startDate: '2025-07-01',
      lastActivity: '1 day ago'
    },
    {
      id: '3',
      name: 'Healthcare IT Directors',
      status: 'paused',
      totalProspects: 80,
      connectionsSent: 65,
      connectionsAccepted: 28,
      messagesSent: 25,
      replies: 8,
      meetings: 2,
      responseRate: 32.0,
      conversionRate: 8.0,
      startDate: '2025-06-20',
      lastActivity: '5 days ago'
    }
  ];

  const overallStats = {
    totalSequences: sequences.length,
    activeSequences: sequences.filter(s => s.status === 'active').length,
    totalProspects: sequences.reduce((acc, s) => acc + s.totalProspects, 0),
    totalReplies: sequences.reduce((acc, s) => acc + s.replies, 0),
    avgResponseRate: sequences.reduce((acc, s) => acc + s.responseRate, 0) / sequences.length,
    totalMeetings: sequences.reduce((acc, s) => acc + s.meetings, 0)
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: "default", className: "bg-green-100 text-green-800" },
      paused: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
      completed: { variant: "outline", className: "bg-gray-100 text-gray-800" }
    };
    
    return variants[status] || variants.active;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">LinkedIn Sequence Reports</h2>
          <p className="text-gray-600">Track performance of your outreach sequences</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="7d" className="text-gray-900 hover:bg-gray-100">Last 7 days</SelectItem>
              <SelectItem value="30d" className="text-gray-900 hover:bg-gray-100">Last 30 days</SelectItem>
              <SelectItem value="90d" className="text-gray-900 hover:bg-gray-100">Last 90 days</SelectItem>
              <SelectItem value="all" className="text-gray-900 hover:bg-gray-100">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => toast({title: "Export Report", description: "Sequence report export coming soon"})}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sequences</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overallStats.activeSequences}
                  <span className="text-sm font-normal text-gray-500">/{overallStats.totalSequences}</span>
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Play className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Prospects</p>
                <p className="text-2xl font-bold text-gray-900">{overallStats.totalProspects.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold text-gray-900">{overallStats.avgResponseRate.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meetings Booked</p>
                <p className="text-2xl font-bold text-gray-900">{overallStats.totalMeetings}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sequence Performance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sequence Performance</CardTitle>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="performance" className="text-gray-900 hover:bg-gray-100">Performance</SelectItem>
              <SelectItem value="name" className="text-gray-900 hover:bg-gray-100">Name</SelectItem>
              <SelectItem value="prospects" className="text-gray-900 hover:bg-gray-100">Prospects</SelectItem>
              <SelectItem value="response_rate" className="text-gray-900 hover:bg-gray-100">Response Rate</SelectItem>
              <SelectItem value="meetings" className="text-gray-900 hover:bg-gray-100">Meetings</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Sequence</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Prospects</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Connections</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Messages</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Replies</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Response Rate</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Meetings</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Last Activity</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((sequence) => (
                  <tr key={sequence.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{sequence.name}</div>
                        <div className="text-sm text-gray-500">Started {new Date(sequence.startDate).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge 
                        {...getStatusBadge(sequence.status)}
                        className={getStatusBadge(sequence.status).className}
                      >
                        {sequence.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center">{sequence.totalProspects}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="text-sm">
                        <div>{sequence.connectionsAccepted}/{sequence.connectionsSent}</div>
                        <div className="text-gray-500">
                          {((sequence.connectionsAccepted / sequence.connectionsSent) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">{sequence.messagesSent}</td>
                    <td className="py-4 px-4 text-center">{sequence.replies}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-medium ${sequence.responseRate > 30 ? 'text-green-600' : sequence.responseRate > 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {sequence.responseRate}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-medium text-blue-600">{sequence.meetings}</span>
                    </td>
                    <td className="py-4 px-4 text-center text-sm text-gray-500">
                      {sequence.lastActivity}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {sequence.status === 'active' ? (
                          <Button variant="ghost" size="sm" onClick={() => toast({title: "Pause Sequence", description: "Sequence pause functionality coming soon"})}>
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => toast({title: "Resume Sequence", description: "Sequence resume functionality coming soon"})}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => toast({title: "Sequence Options", description: "Advanced sequence options coming soon"})}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}