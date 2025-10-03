import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  Calendar, 
  Star, 
  Users, 
  Filter,
  RefreshCw,
  Eye,
  Building2,
  Target
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface MatchingStats {
  totalApplications: number;
  totalLenders: number;
  totalMatches: number;
  highQualityMatches: number;
  averageMatchScore: number;
  topPerformingLenders: Array<{
    lenderName: string;
    matches: number;
    acceptanceRate: number;
  }>;
}

interface LenderSummary {
  id: string;
  lenderName: string;
  totalProducts: number;
  activeProducts: number;
  totalMatches: number;
  averageMatchScore: number;
  country: string;
}

export default function LenderMatchingPage() {
  const { toast } = useToast();
  const [selectedLender, setSelectedLender] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [minScore, setMinScore] = useState(0.5);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch matching statistics
  const { data: stats, isLoading: loadingStats } = useQuery<MatchingStats>({
    queryKey: ['matching-stats'],
    queryFn: async () => {
      // Mock data for demo - in production this would come from API
      return {
        totalApplications: 156,
        totalLenders: 23,
        totalMatches: 342,
        highQualityMatches: 218,
        averageMatchScore: 0.73,
        topPerformingLenders: [
          { lenderName: 'Stride Capital', matches: 45, acceptanceRate: 0.82 },
          { lenderName: 'Revenued', matches: 38, acceptanceRate: 0.76 },
          { lenderName: 'Accord Financial', matches: 32, acceptanceRate: 0.71 }
        ]
      };
    },
  });

  // Fetch lender summaries
  const { data: lenderSummaries, isLoading: loadingLenders } = useQuery<LenderSummary[]>({
    queryKey: ['lender-summaries', countryFilter, categoryFilter],
    queryFn: async () => {
      // Mock data for demo
      return [
        {
          id: 'stride-capital',
          lenderName: 'Stride Capital',
          totalProducts: 8,
          activeProducts: 7,
          totalMatches: 45,
          averageMatchScore: 0.78,
          country: 'Canada'
        },
        {
          id: 'revenued',
          lenderName: 'Revenued',
          totalProducts: 6,
          activeProducts: 5,
          totalMatches: 38,
          averageMatchScore: 0.72,
          country: 'Canada'
        },
        {
          id: 'accord-financial',
          lenderName: 'Accord Financial',
          totalProducts: 12,
          activeProducts: 10,
          totalMatches: 32,
          averageMatchScore: 0.69,
          country: 'Canada'
        },
        {
          id: 'american-express',
          lenderName: 'American Express',
          totalProducts: 4,
          activeProducts: 4,
          totalMatches: 28,
          averageMatchScore: 0.75,
          country: 'United States'
        }
      ].filter(lender => countryFilter === 'all' || lender.country === countryFilter);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loadingStats || loadingLenders) {
    return (
      <div>
        <div className="p-6">
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p>Loading matching analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lender Application Matching</h1>
          <p className="text-gray-600 mt-1">
            Monitor and analyze application matching across your lender network
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" 
            className="flex items-center gap-2" onClick={() => toast({title: "Refresh Data", description: "Data refresh functionality coming soon"})}>
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Applications</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalApplications}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Lenders</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalLenders}</p>
                </div>
                <Building2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Matches</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalMatches}</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Quality</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.highQualityMatches}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Score</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {(stats.averageMatchScore * 100).toFixed(0)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Country:</label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="all" className="text-gray-900 hover:bg-gray-100">All Countries</SelectItem>
                  <SelectItem value="Canada" className="text-gray-900 hover:bg-gray-100">Canada</SelectItem>
                  <SelectItem value="United States" className="text-gray-900 hover:bg-gray-100">United States</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Product Category:</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="all" className="text-gray-900 hover:bg-gray-100">All Categories</SelectItem>
                  <SelectItem value="Factoring" className="text-gray-900 hover:bg-gray-100">Factoring</SelectItem>
                  <SelectItem value="Term Loans" className="text-gray-900 hover:bg-gray-100">Term Loans</SelectItem>
                  <SelectItem value="Lines of Credit" className="text-gray-900 hover:bg-gray-100">Lines of Credit</SelectItem>
                  <SelectItem value="SBA Loans" className="text-gray-900 hover:bg-gray-100">SBA Loans</SelectItem>
                  <SelectItem value="Equipment Financing" className="text-gray-900 hover:bg-gray-100">Equipment Financing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Min Score:</label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={minScore}
                onChange={(e) => setMinScore(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-500">
                ({(minScore * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lenders">Lender Performance</TabsTrigger>
          <TabsTrigger value="matches">Active Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Lenders */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Lenders</CardTitle>
                <CardDescription>Lenders with highest match volumes and acceptance rates</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.topPerformingLenders.map((lender, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{lender.lenderName}</p>
                      <p className="text-sm text-gray-600">
                        {lender.matches} matches • {(lender.acceptanceRate * 100).toFixed(0)}% acceptance
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Match Quality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Match Quality Distribution</CardTitle>
                <CardDescription>Breakdown of matches by quality score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Quality (80%+)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '64%' }}></div>
                      </div>
                      <span className="text-sm font-medium">140</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medium Quality (60-79%)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '23%' }}></div>
                      </div>
                      <span className="text-sm font-medium">78</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Lower Quality (40-59%)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '13%' }}></div>
                      </div>
                      <span className="text-sm font-medium">124</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lenders">
          <div className="grid gap-4">
            {lenderSummaries?.map((lender) => (
              <Card key={lender.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{lender.lenderName}</h3>
                        <Badge variant="outline">{lender.country}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600">Products</p>
                          <p className="text-lg font-medium">{lender.activeProducts}/{lender.totalProducts}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Matches</p>
                          <p className="text-lg font-medium">{lender.totalMatches}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Avg. Score</p>
                          <p className={`text-lg font-medium ${getScoreColor(lender.averageMatchScore)}`}>
                            {(lender.averageMatchScore * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" 
                            size="sm"
                            className="flex items-center gap-1" onClick={() => toast({title: "View Details", description: "Lender details viewer coming soon"})}>
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matches">
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Active Matches View</h3>
              <p className="text-gray-600 mb-4">
                This view will show real-time application matches across all lenders.
              </p>
              <Button variant="outline" onClick={() => toast({title: "View Lender Matches", description: "Lender matches page coming soon"})}>
                View Lender Matches Page
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}