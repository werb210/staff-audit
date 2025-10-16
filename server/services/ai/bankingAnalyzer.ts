import OpenAI from "openai";
import { documentInsightsService } from './documentInsights';
import { db } from '../../db';
import { documents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MonthlyBankStats {
  month: string;
  year: number;
  openingBalance: number;
  closingBalance: number;
  minBalance: number;
  maxBalance: number;
  nsfCount: number;
  nsfFees: number;
  overdraftDays: number;
  transactionCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  averageBalance: number;
}

export interface BankingAnalysis {
  documentId: string;
  documentName: string;
  accountNumber?: string;
  accountType?: string;
  bankName?: string;
  statementPeriod: {
    startDate: string;
    endDate: string;
  };
  monthlyStats: MonthlyBankStats[];
  overallSummary: {
    averageMonthlyBalance: number;
    lowestBalance: number;
    highestBalance: number;
    totalNSFIncidents: number;
    totalNSFFees: number;
    overdraftFrequency: number; // percentage of days with negative balance
    cashflowTrend: 'improving' | 'stable' | 'declining';
    riskFlags: string[];
  };
  insights: string[];
  recommendations: string[];
  analysisConfidence: number;
  analyzedAt: Date;
}

export class BankingAnalyzerService {
  // Main function to analyze banking statement
  async analyzeBankingStatement(documentId: string): Promise<BankingAnalysis> {
    try {
      console.log(`[BANKING-ANALYZER] Starting analysis for document ${documentId}`);

      // Get document from database
      const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (doc.length === 0) {
        throw new Error('Document not found');
      }

      const document = doc[0];
      
      if (!document.filePath && !document.storageKey) {
        throw new Error('Document file path not found');
      }

      // Extract text from banking statement
      const text = await documentInsightsService.extractTextFromPDF(
        document.filePath || document.storageKey!
      );

      if (!text) {
        throw new Error('Could not extract text from banking statement');
      }

      // Parse banking data using multiple methods
      const basicInfo = await this.extractBasicBankInfo(text);
      const monthlyStats = await this.extractMonthlyStats(text);
      const aiEnhancedStats = await this.enhanceWithAI(text, monthlyStats);

      // Generate analysis and insights
      const overallSummary = this.calculateOverallSummary(aiEnhancedStats);
      const insights = await this.generateInsights(aiEnhancedStats, overallSummary);
      const recommendations = this.generateRecommendations(overallSummary);

      const analysis: BankingAnalysis = {
        documentId,
        documentName: document.fileName || 'Banking Statement',
        accountNumber: basicInfo.accountNumber,
        accountType: basicInfo.accountType,
        bankName: basicInfo.bankName,
        statementPeriod: basicInfo.statementPeriod,
        monthlyStats: aiEnhancedStats,
        overallSummary,
        insights,
        recommendations,
        analysisConfidence: this.calculateConfidence(aiEnhancedStats, text),
        analyzedAt: new Date()
      };

      // Save analysis to document metadata
      await this.saveBankingAnalysis(documentId, analysis);

      console.log(`[BANKING-ANALYZER] Completed analysis: ${aiEnhancedStats.length} months processed`);

      return analysis;

    } catch (error) {
      console.error('[BANKING-ANALYZER] Error analyzing banking statement:', error);
      throw error;
    }
  }

  // Extract basic bank information
  private async extractBasicBankInfo(text: string): Promise<{
    accountNumber?: string;
    accountType?: string;
    bankName?: string;
    statementPeriod: { startDate: string; endDate: string };
  }> {
    // Account number patterns
    const accountMatch = text.match(/(?:Account|Acct)(?:\s*#?\s*:?\s*)(\d{7,12})/i);
    const accountNumber = accountMatch ? accountMatch[1] : undefined;

    // Bank name patterns (common Canadian banks)
    const bankPatterns = [
      /Royal Bank of Canada|RBC/i,
      /Toronto-Dominion|TD Bank|TD/i,
      /Bank of Nova Scotia|Scotiabank/i,
      /Bank of Montreal|BMO/i,
      /Canadian Imperial Bank|CIBC/i,
      /National Bank of Canada|NBC/i
    ];

    let bankName: string | undefined;
    for (const pattern of bankPatterns) {
      const match = text.match(pattern);
      if (match) {
        bankName = match[0];
        break;
      }
    }

    // Account type
    const typePatterns = [
      /Chequing|Checking/i,
      /Savings/i,
      /Business/i,
      /Current/i
    ];

    let accountType: string | undefined;
    for (const pattern of typePatterns) {
      const match = text.match(pattern);
      if (match) {
        accountType = match[0];
        break;
      }
    }

    // Statement period
    const datePattern = /(\w{3}\s+\d{1,2},?\s+\d{4})/g;
    const dates = text.match(datePattern);
    
    let startDate = '';
    let endDate = '';
    
    if (dates && dates.length >= 2) {
      startDate = dates[0];
      endDate = dates[dates.length - 1];
    }

    return {
      accountNumber,
      accountType,
      bankName,
      statementPeriod: { startDate, endDate }
    };
  }

  // Extract monthly statistics using regex patterns
  private async extractMonthlyStats(text: string): Promise<MonthlyBankStats[]> {
    const monthlyStats: MonthlyBankStats[] = [];
    const lines = text.split('\n');

    // Track monthly data
    const monthlyData: { [monthYear: string]: Partial<MonthlyBankStats> } = {};

    for (const line of lines) {
      // Date pattern matching
      const dateMatch = line.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/);
      if (!dateMatch) continue;

      const [, month, day, year] = dateMatch;
      const monthYear = `${month} ${year}`;

      // Initialize month if not exists
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          month,
          year: parseInt(year),
          minBalance: Infinity,
          maxBalance: -Infinity,
          nsfCount: 0,
          nsfFees: 0,
          overdraftDays: 0,
          transactionCount: 0,
          totalDeposits: 0,
          totalWithdrawals: 0
        };
      }

      // Extract balance information
      const balanceMatch = line.match(/\$?\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
      if (balanceMatch) {
        const amounts = balanceMatch.map(amount => 
          parseFloat(amount.replace(/[\$,\s]/g, ''))
        ).filter(amount => !isNaN(amount));

        if (amounts.length > 0) {
          const balance = amounts[amounts.length - 1]; // Assume last amount is balance
          
          monthlyData[monthYear].minBalance = Math.min(
            monthlyData[monthYear].minBalance || Infinity, 
            balance
          );
          monthlyData[monthYear].maxBalance = Math.max(
            monthlyData[monthYear].maxBalance || -Infinity, 
            balance
          );

          if (balance < 0) {
            monthlyData[monthYear].overdraftDays! += 1;
          }
        }
      }

      // NSF detection
      if (/NSF|Non-Sufficient|Insufficient.*Fund/i.test(line)) {
        monthlyData[monthYear].nsfCount! += 1;
        
        // Extract NSF fee
        const feeMatch = line.match(/\$(\d+\.?\d*)/);
        if (feeMatch) {
          monthlyData[monthYear].nsfFees! += parseFloat(feeMatch[1]);
        }
      }

      // Transaction counting
      if (balanceMatch && balanceMatch.length > 0) {
        monthlyData[monthYear].transactionCount! += 1;

        // Simple deposit/withdrawal detection
        if (/deposit|credit/i.test(line)) {
          const amount = parseFloat(balanceMatch[0].replace(/[\$,\s]/g, ''));
          if (!isNaN(amount) && amount > 0) {
            monthlyData[monthYear].totalDeposits! += amount;
          }
        } else if (/withdrawal|debit|payment/i.test(line)) {
          const amount = parseFloat(balanceMatch[0].replace(/[\$,\s]/g, ''));
          if (!isNaN(amount) && amount > 0) {
            monthlyData[monthYear].totalWithdrawals! += amount;
          }
        }
      }
    }

    // Convert to array and calculate derived fields
    for (const [monthYear, data] of Object.entries(monthlyData)) {
      if (data.minBalance === Infinity) data.minBalance = 0;
      if (data.maxBalance === -Infinity) data.maxBalance = 0;

      // Calculate average balance (simplified)
      data.averageBalance = (data.minBalance! + data.maxBalance!) / 2;
      
      // Assume opening/closing balances
      data.openingBalance = data.minBalance;
      data.closingBalance = data.maxBalance;

      monthlyStats.push(data as MonthlyBankStats);
    }

    return monthlyStats.sort((a, b) => 
      new Date(`${a.month} ${a.year}`).getTime() - new Date(`${b.month} ${b.year}`).getTime()
    );
  }

  // Enhance statistics using AI for more accurate parsing
  private async enhanceWithAI(text: string, basicStats: MonthlyBankStats[]): Promise<MonthlyBankStats[]> {
    try {
      const prompt = `Analyze this banking statement text and extract accurate monthly statistics:

${text.substring(0, 3000)}

Current basic analysis found ${basicStats.length} months. Please enhance this data and provide accurate monthly banking statistics in JSON format:

{
  "monthlyStats": [
    {
      "month": "Jan",
      "year": 2024,
      "openingBalance": 1000.00,
      "closingBalance": 1200.00,
      "minBalance": 900.00,
      "maxBalance": 1300.00,
      "nsfCount": 0,
      "nsfFees": 0.00,
      "overdraftDays": 0,
      "transactionCount": 15,
      "totalDeposits": 2000.00,
      "totalWithdrawals": 1800.00,
      "averageBalance": 1100.00
    }
  ]
}

Focus on accuracy. Extract actual NSF incidents, fees, and balance information from the statement.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a banking expert specializing in statement analysis. Extract accurate financial data from banking statements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{"monthlyStats": []}');
      const aiStats = result.monthlyStats || [];

      // Merge AI results with basic stats, preferring AI data
      if (aiStats.length > 0) {
        return aiStats;
      }

      return basicStats;

    } catch (error) {
      console.error('[BANKING-ANALYZER] AI enhancement failed:', error);
      return basicStats;
    }
  }

  // Calculate overall summary statistics
  private calculateOverallSummary(monthlyStats: MonthlyBankStats[]): BankingAnalysis['overallSummary'] {
    if (monthlyStats.length === 0) {
      return {
        averageMonthlyBalance: 0,
        lowestBalance: 0,
        highestBalance: 0,
        totalNSFIncidents: 0,
        totalNSFFees: 0,
        overdraftFrequency: 0,
        cashflowTrend: 'stable',
        riskFlags: ['Insufficient data for analysis']
      };
    }

    const averageMonthlyBalance = monthlyStats.reduce((sum, month) => 
      sum + month.averageBalance, 0) / monthlyStats.length;

    const lowestBalance = Math.min(...monthlyStats.map(m => m.minBalance));
    const highestBalance = Math.max(...monthlyStats.map(m => m.maxBalance));
    
    const totalNSFIncidents = monthlyStats.reduce((sum, month) => sum + month.nsfCount, 0);
    const totalNSFFees = monthlyStats.reduce((sum, month) => sum + month.nsfFees, 0);
    
    const totalDays = monthlyStats.length * 30; // Approximate
    const totalOverdraftDays = monthlyStats.reduce((sum, month) => sum + month.overdraftDays, 0);
    const overdraftFrequency = totalDays > 0 ? (totalOverdraftDays / totalDays) * 100 : 0;

    // Determine cashflow trend
    let cashflowTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (monthlyStats.length >= 3) {
      const firstThird = monthlyStats.slice(0, Math.floor(monthlyStats.length / 3));
      const lastThird = monthlyStats.slice(-Math.floor(monthlyStats.length / 3));
      
      const firstAvg = firstThird.reduce((sum, m) => sum + m.averageBalance, 0) / firstThird.length;
      const lastAvg = lastThird.reduce((sum, m) => sum + m.averageBalance, 0) / lastThird.length;
      
      const change = (lastAvg - firstAvg) / firstAvg;
      if (change > 0.1) cashflowTrend = 'improving';
      else if (change < -0.1) cashflowTrend = 'declining';
    }

    // Generate risk flags
    const riskFlags: string[] = [];
    if (totalNSFIncidents > 0) riskFlags.push(`${totalNSFIncidents} NSF incidents found`);
    if (overdraftFrequency > 10) riskFlags.push('Frequent overdrafts detected');
    if (lowestBalance < -1000) riskFlags.push('Significant negative balances');
    if (cashflowTrend === 'declining') riskFlags.push('Declining cashflow trend');

    return {
      averageMonthlyBalance,
      lowestBalance,
      highestBalance,
      totalNSFIncidents,
      totalNSFFees,
      overdraftFrequency,
      cashflowTrend,
      riskFlags
    };
  }

  // Generate insights using AI
  private async generateInsights(
    monthlyStats: MonthlyBankStats[], 
    summary: BankingAnalysis['overallSummary']
  ): Promise<string[]> {
    const insights: string[] = [];

    // Balance insights
    if (summary.averageMonthlyBalance > 10000) {
      insights.push('Strong average monthly balance indicates good cash reserves');
    } else if (summary.averageMonthlyBalance < 1000) {
      insights.push('Low average balance may indicate cashflow challenges');
    }

    // NSF insights
    if (summary.totalNSFIncidents === 0) {
      insights.push('No NSF incidents shows good account management');
    } else {
      insights.push(`${summary.totalNSFIncidents} NSF incidents indicate potential cashflow issues`);
    }

    // Trend insights
    switch (summary.cashflowTrend) {
      case 'improving':
        insights.push('Improving cashflow trend shows business growth');
        break;
      case 'declining':
        insights.push('Declining cashflow trend requires attention');
        break;
      case 'stable':
        insights.push('Stable cashflow indicates consistent business performance');
        break;
    }

    // Overdraft insights
    if (summary.overdraftFrequency > 20) {
      insights.push('High overdraft frequency indicates working capital challenges');
    }

    return insights;
  }

  // Generate recommendations
  private generateRecommendations(summary: BankingAnalysis['overallSummary']): string[] {
    const recommendations: string[] = [];

    if (summary.totalNSFIncidents > 0) {
      recommendations.push('Consider requiring a larger cash reserve or line of credit');
    }

    if (summary.overdraftFrequency > 15) {
      recommendations.push('Review working capital requirements and consider term financing');
    }

    if (summary.cashflowTrend === 'declining') {
      recommendations.push('Request current financial statements to assess business viability');
    }

    if (summary.riskFlags.length > 2) {
      recommendations.push('Consider additional security or guarantees due to banking history');
    }

    if (summary.averageMonthlyBalance > 50000) {
      recommendations.push('Strong cash position supports larger loan amounts');
    }

    return recommendations;
  }

  // Calculate analysis confidence
  private calculateConfidence(monthlyStats: MonthlyBankStats[], text: string): number {
    let confidence = 0.5; // Base confidence

    // More months = higher confidence
    if (monthlyStats.length >= 12) confidence += 0.3;
    else if (monthlyStats.length >= 6) confidence += 0.2;
    else if (monthlyStats.length >= 3) confidence += 0.1;

    // Text quality indicators
    if (text.length > 5000) confidence += 0.1;
    if (text.includes('Statement')) confidence += 0.1;

    return Math.min(1, confidence);
  }

  // Save analysis to document metadata
  private async saveBankingAnalysis(documentId: string, analysis: BankingAnalysis): Promise<void> {
    try {
      await db
        .update(documents)
        .set({
          metadata: {
            bankingAnalysis: {
              monthlyStats: analysis.monthlyStats,
              overallSummary: analysis.overallSummary,
              insights: analysis.insights,
              recommendations: analysis.recommendations,
              analysisConfidence: analysis.analysisConfidence,
              analyzedAt: analysis.analyzedAt.toISOString()
            }
          }
        })
        .where(eq(documents.id, documentId));

      console.log(`[BANKING-ANALYZER] Saved analysis to document ${documentId}`);
    } catch (error) {
      console.error('[BANKING-ANALYZER] Failed to save analysis:', error);
    }
  }

  // Batch analyze multiple banking statements
  async batchAnalyzeBankingStatements(documentIds: string[]): Promise<{
    analyses: BankingAnalysis[];
    errors: { documentId: string; error: string }[];
  }> {
    const analyses: BankingAnalysis[] = [];
    const errors: { documentId: string; error: string }[] = [];

    for (const documentId of documentIds) {
      try {
        const analysis = await this.analyzeBankingStatement(documentId);
        analyses.push(analysis);
      } catch (error) {
        errors.push({
          documentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { analyses, errors };
  }
}

export const bankingAnalyzerService = new BankingAnalyzerService();