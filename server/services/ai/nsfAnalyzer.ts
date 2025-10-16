import { bankingAnalyzerService } from './bankingAnalyzer';

export interface MonthlyNSFData {
  month: string;
  year: number;
  nsfCount: number;
  nsfFees: number;
  averageFeePerIncident: number;
  daysWithNSF: number;
  consecutiveNSFDays: number;
}

export interface NSFTrendAnalysis {
  documentId: string;
  documentName: string;
  analysisRange: {
    startDate: string;
    endDate: string;
    totalMonths: number;
  };
  monthlyNSFData: MonthlyNSFData[];
  overallSummary: {
    totalNSFIncidents: number;
    totalNSFFees: number;
    averageMonthlyNSF: number;
    monthsWithNSF: number;
    peakNSFMonth: string;
    nsfFrequency: number; // NSF incidents per month
    trend: 'IMPROVING' | 'WORSENING' | 'STABLE';
    severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  };
  trendAnalysis: {
    direction: 'UP' | 'DOWN' | 'FLAT';
    magnitude: number; // % change from first to last period
    consistency: 'CONSISTENT' | 'VOLATILE' | 'SPORADIC';
    recentTrend: 'IMPROVING' | 'WORSENING' | 'STABLE'; // Last 3 months
  };
  riskFactors: string[];
  insights: string[];
  recommendations: string[];
  analyzedAt: Date;
}

export class NSFAnalyzerService {
  // Main function to analyze NSF trends
  async analyzeNSFTrends(documentId: string): Promise<NSFTrendAnalysis> {
    try {
      console.log(`[NSF-ANALYZER] Analyzing NSF trends for document ${documentId}`);

      // Get banking analysis data
      const bankingAnalysis = await bankingAnalyzerService.analyzeBankingStatement(documentId);

      if (!bankingAnalysis.monthlyStats || bankingAnalysis.monthlyStats.length === 0) {
        return this.generateEmptyAnalysis(documentId);
      }

      // Extract NSF data from monthly stats
      const monthlyNSFData = this.extractMonthlyNSFData(bankingAnalysis.monthlyStats);

      // Calculate overall summary
      const overallSummary = this.calculateOverallSummary(monthlyNSFData);

      // Perform trend analysis
      const trendAnalysis = this.performTrendAnalysis(monthlyNSFData);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(overallSummary, trendAnalysis);

      // Generate insights
      const insights = this.generateInsights(overallSummary, trendAnalysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(overallSummary, trendAnalysis);

      const analysis: NSFTrendAnalysis = {
        documentId,
        documentName: bankingAnalysis.documentName,
        analysisRange: {
          startDate: this.getEarliestDate(monthlyNSFData),
          endDate: this.getLatestDate(monthlyNSFData),
          totalMonths: monthlyNSFData.length
        },
        monthlyNSFData,
        overallSummary,
        trendAnalysis,
        riskFactors,
        insights,
        recommendations,
        analyzedAt: new Date()
      };

      console.log(`[NSF-ANALYZER] Found ${overallSummary.totalNSFIncidents} NSF incidents over ${monthlyNSFData.length} months`);

      return analysis;

    } catch (error) {
      console.error('[NSF-ANALYZER] Error analyzing NSF trends:', error);
      throw error;
    }
  }

  // Extract monthly NSF data from banking stats
  private extractMonthlyNSFData(monthlyStats: any[]): MonthlyNSFData[] {
    return monthlyStats.map(monthStat => {
      const nsfCount = monthStat.nsfCount || 0;
      const nsfFees = monthStat.nsfFees || 0;
      const averageFeePerIncident = nsfCount > 0 ? nsfFees / nsfCount : 0;
      
      // Estimate days with NSF (simplified - assume each incident spans 1-2 days)
      const daysWithNSF = Math.min(nsfCount * 1.5, 30);
      
      // Estimate consecutive NSF days (simplified)
      const consecutiveNSFDays = nsfCount > 3 ? Math.floor(nsfCount / 2) : 0;

      return {
        month: monthStat.month,
        year: monthStat.year,
        nsfCount,
        nsfFees: Math.round(nsfFees * 100) / 100,
        averageFeePerIncident: Math.round(averageFeePerIncident * 100) / 100,
        daysWithNSF: Math.round(daysWithNSF),
        consecutiveNSFDays
      };
    });
  }

  // Calculate overall summary statistics
  private calculateOverallSummary(monthlyNSFData: MonthlyNSFData[]): NSFTrendAnalysis['overallSummary'] {
    if (monthlyNSFData.length === 0) {
      return {
        totalNSFIncidents: 0,
        totalNSFFees: 0,
        averageMonthlyNSF: 0,
        monthsWithNSF: 0,
        peakNSFMonth: 'None',
        nsfFrequency: 0,
        trend: 'STABLE',
        severity: 'LOW'
      };
    }

    const totalNSFIncidents = monthlyNSFData.reduce((sum, month) => sum + month.nsfCount, 0);
    const totalNSFFees = monthlyNSFData.reduce((sum, month) => sum + month.nsfFees, 0);
    const averageMonthlyNSF = totalNSFIncidents / monthlyNSFData.length;
    const monthsWithNSF = monthlyNSFData.filter(month => month.nsfCount > 0).length;
    
    // Find peak NSF month
    const peakMonth = monthlyNSFData.reduce((peak, current) => 
      current.nsfCount > peak.nsfCount ? current : peak
    );
    const peakNSFMonth = peakMonth.nsfCount > 0 ? `${peakMonth.month} ${peakMonth.year}` : 'None';
    
    const nsfFrequency = Math.round((totalNSFIncidents / monthlyNSFData.length) * 100) / 100;

    // Determine overall trend
    const trend = this.determineOverallTrend(monthlyNSFData);

    // Determine severity
    const severity = this.determineSeverity(totalNSFIncidents, averageMonthlyNSF, monthsWithNSF);

    return {
      totalNSFIncidents,
      totalNSFFees: Math.round(totalNSFFees * 100) / 100,
      averageMonthlyNSF: Math.round(averageMonthlyNSF * 100) / 100,
      monthsWithNSF,
      peakNSFMonth,
      nsfFrequency,
      trend,
      severity
    };
  }

  // Determine overall trend across the analysis period
  private determineOverallTrend(monthlyNSFData: MonthlyNSFData[]): 'IMPROVING' | 'WORSENING' | 'STABLE' {
    if (monthlyNSFData.length < 3) return 'STABLE';

    // Compare first third to last third
    const firstThird = monthlyNSFData.slice(0, Math.floor(monthlyNSFData.length / 3));
    const lastThird = monthlyNSFData.slice(-Math.floor(monthlyNSFData.length / 3));

    const firstAvgNSF = firstThird.reduce((sum, m) => sum + m.nsfCount, 0) / firstThird.length;
    const lastAvgNSF = lastThird.reduce((sum, m) => sum + m.nsfCount, 0) / lastThird.length;

    const change = lastAvgNSF - firstAvgNSF;

    if (change >= 1) return 'WORSENING'; // More than 1 additional NSF per month
    if (change <= -0.5) return 'IMPROVING'; // At least 0.5 fewer NSF per month
    return 'STABLE';
  }

  // Determine severity based on NSF patterns
  private determineSeverity(
    totalIncidents: number, 
    averageMonthly: number, 
    monthsWithNSF: number
  ): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
    // Critical: Very frequent NSF incidents
    if (averageMonthly >= 3 || totalIncidents >= 15) return 'CRITICAL';
    
    // High: Regular NSF incidents
    if (averageMonthly >= 1.5 || totalIncidents >= 8) return 'HIGH';
    
    // Moderate: Occasional NSF incidents
    if (averageMonthly >= 0.5 || totalIncidents >= 3) return 'MODERATE';
    
    // Low: Rare or no NSF incidents
    return 'LOW';
  }

  // Perform detailed trend analysis
  private performTrendAnalysis(monthlyNSFData: MonthlyNSFData[]): NSFTrendAnalysis['trendAnalysis'] {
    if (monthlyNSFData.length < 2) {
      return {
        direction: 'FLAT',
        magnitude: 0,
        consistency: 'SPORADIC',
        recentTrend: 'STABLE'
      };
    }

    // Calculate direction and magnitude
    const firstMonth = monthlyNSFData[0];
    const lastMonth = monthlyNSFData[monthlyNSFData.length - 1];
    
    let direction: 'UP' | 'DOWN' | 'FLAT' = 'FLAT';
    let magnitude = 0;

    if (firstMonth.nsfCount > 0 || lastMonth.nsfCount > 0) {
      const change = lastMonth.nsfCount - firstMonth.nsfCount;
      magnitude = firstMonth.nsfCount > 0 ? (change / firstMonth.nsfCount) * 100 : 
                  lastMonth.nsfCount > 0 ? 100 : 0;

      if (change > 0.5) direction = 'UP';
      else if (change < -0.5) direction = 'DOWN';
    }

    // Assess consistency
    const consistency = this.assessConsistency(monthlyNSFData);

    // Recent trend (last 3 months)
    const recentTrend = this.assessRecentTrend(monthlyNSFData);

    return {
      direction,
      magnitude: Math.round(magnitude * 10) / 10,
      consistency,
      recentTrend
    };
  }

  // Assess consistency of NSF patterns
  private assessConsistency(monthlyNSFData: MonthlyNSFData[]): 'CONSISTENT' | 'VOLATILE' | 'SPORADIC' {
    const nsfCounts = monthlyNSFData.map(m => m.nsfCount);
    const avg = nsfCounts.reduce((sum, count) => sum + count, 0) / nsfCounts.length;
    
    // Calculate standard deviation
    const variance = nsfCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / nsfCounts.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation
    const cv = avg > 0 ? stdDev / avg : 0;

    if (cv < 0.5) return 'CONSISTENT';
    if (cv < 1.0) return 'VOLATILE';
    return 'SPORADIC';
  }

  // Assess recent trend (last 3 months)
  private assessRecentTrend(monthlyNSFData: MonthlyNSFData[]): 'IMPROVING' | 'WORSENING' | 'STABLE' {
    if (monthlyNSFData.length < 3) return 'STABLE';

    const recent = monthlyNSFData.slice(-3);
    const recentAvg = recent.reduce((sum, m) => sum + m.nsfCount, 0) / recent.length;
    
    const earlier = monthlyNSFData.slice(-6, -3);
    if (earlier.length === 0) return 'STABLE';
    
    const earlierAvg = earlier.reduce((sum, m) => sum + m.nsfCount, 0) / earlier.length;
    
    const change = recentAvg - earlierAvg;
    
    if (change >= 0.5) return 'WORSENING';
    if (change <= -0.5) return 'IMPROVING';
    return 'STABLE';
  }

  // Identify risk factors based on NSF analysis
  private identifyRiskFactors(
    summary: NSFTrendAnalysis['overallSummary'],
    trends: NSFTrendAnalysis['trendAnalysis']
  ): string[] {
    const risks: string[] = [];

    // High NSF frequency
    if (summary.severity === 'CRITICAL') {
      risks.push('Critical NSF frequency indicates severe cash flow problems');
    } else if (summary.severity === 'HIGH') {
      risks.push('High NSF frequency suggests significant cash management issues');
    }

    // Worsening trends
    if (summary.trend === 'WORSENING' || trends.recentTrend === 'WORSENING') {
      risks.push('NSF incidents are increasing over time');
    }

    // Consistent NSF pattern
    if (trends.consistency === 'CONSISTENT' && summary.averageMonthlyNSF > 1) {
      risks.push('Consistent NSF pattern suggests systemic cash flow issues');
    }

    // High fees
    if (summary.totalNSFFees > 500) {
      risks.push('Significant NSF fees impact business profitability');
    }

    // Recent deterioration
    if (trends.direction === 'UP' && trends.magnitude > 50) {
      risks.push('Significant recent increase in NSF incidents');
    }

    return risks;
  }

  // Generate insights from NSF analysis
  private generateInsights(
    summary: NSFTrendAnalysis['overallSummary'],
    trends: NSFTrendAnalysis['trendAnalysis']
  ): string[] {
    const insights: string[] = [];

    // Positive insights
    if (summary.totalNSFIncidents === 0) {
      insights.push('No NSF incidents demonstrates excellent cash management');
      return insights;
    }

    if (summary.trend === 'IMPROVING' || trends.recentTrend === 'IMPROVING') {
      insights.push('NSF incidents are decreasing, showing improved cash management');
    }

    // Pattern insights
    if (trends.consistency === 'SPORADIC') {
      insights.push('Sporadic NSF pattern suggests occasional cash flow challenges');
    } else if (trends.consistency === 'VOLATILE') {
      insights.push('Volatile NSF pattern indicates unpredictable cash flow issues');
    }

    // Frequency insights
    if (summary.averageMonthlyNSF < 0.5) {
      insights.push('Low average NSF frequency indicates generally stable operations');
    }

    // Seasonal or temporal patterns
    if (summary.monthsWithNSF < summary.totalNSFIncidents * 0.7) {
      insights.push('NSF incidents concentrated in specific months');
    }

    return insights;
  }

  // Generate recommendations based on NSF analysis
  private generateRecommendations(
    summary: NSFTrendAnalysis['overallSummary'],
    trends: NSFTrendAnalysis['trendAnalysis']
  ): string[] {
    const recommendations: string[] = [];

    if (summary.totalNSFIncidents === 0) {
      recommendations.push('Excellent banking history supports lending approval');
      return recommendations;
    }

    // Severity-based recommendations
    if (summary.severity === 'CRITICAL') {
      recommendations.push('CRITICAL: Require cash flow improvement plan before lending');
      recommendations.push('Consider requiring cash collateral or enhanced guarantees');
    } else if (summary.severity === 'HIGH') {
      recommendations.push('Require detailed cash flow projections and monitoring');
      recommendations.push('Consider shorter loan terms with frequent reviews');
    } else if (summary.severity === 'MODERATE') {
      recommendations.push('Monitor cash flow closely and require monthly reports');
    }

    // Trend-based recommendations
    if (summary.trend === 'WORSENING') {
      recommendations.push('Investigate causes of deteriorating cash management');
    } else if (summary.trend === 'IMPROVING') {
      recommendations.push('Positive trend supports lending consideration');
    }

    // General recommendations
    if (summary.totalNSFFees > 200) {
      recommendations.push('Help client establish overdraft protection to reduce fees');
    }

    if (trends.consistency === 'VOLATILE') {
      recommendations.push('Recommend cash flow forecasting and management tools');
    }

    return recommendations;
  }

  // Helper functions
  private getEarliestDate(monthlyNSFData: MonthlyNSFData[]): string {
    if (monthlyNSFData.length === 0) return new Date().toISOString();
    const earliest = monthlyNSFData[0];
    return new Date(earliest.year, this.getMonthNumber(earliest.month), 1).toISOString();
  }

  private getLatestDate(monthlyNSFData: MonthlyNSFData[]): string {
    if (monthlyNSFData.length === 0) return new Date().toISOString();
    const latest = monthlyNSFData[monthlyNSFData.length - 1];
    return new Date(latest.year, this.getMonthNumber(latest.month), 28).toISOString();
  }

  private getMonthNumber(monthName: string): number {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                   'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return months.indexOf(monthName.toLowerCase().substring(0, 3));
  }

  // Generate empty analysis when no data available
  private generateEmptyAnalysis(documentId: string): NSFTrendAnalysis {
    return {
      documentId,
      documentName: 'Unknown Document',
      analysisRange: {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        totalMonths: 0
      },
      monthlyNSFData: [],
      overallSummary: {
        totalNSFIncidents: 0,
        totalNSFFees: 0,
        averageMonthlyNSF: 0,
        monthsWithNSF: 0,
        peakNSFMonth: 'None',
        nsfFrequency: 0,
        trend: 'STABLE',
        severity: 'LOW'
      },
      trendAnalysis: {
        direction: 'FLAT',
        magnitude: 0,
        consistency: 'SPORADIC',
        recentTrend: 'STABLE'
      },
      riskFactors: ['No banking data available for NSF analysis'],
      insights: ['NSF analysis could not be performed due to lack of data'],
      recommendations: ['Provide banking statements to enable NSF analysis'],
      analyzedAt: new Date()
    };
  }
}

export const nsfAnalyzerService = new NSFAnalyzerService();