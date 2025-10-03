import OpenAI from "openai";
import { db } from '../../db';
import { applications, documents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { fieldAggregatorService } from './aggregateFields';
import { discrepancyCheckerService } from './discrepancyChecker';
import { bankingAnalyzerService } from './bankingAnalyzer';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RiskScoreComponents {
  businessRisk: number; // 0-10
  financialRisk: number; // 0-10
  documentRisk: number; // 0-10
  bankingRisk: number; // 0-10
  complianceRisk: number; // 0-10
}

export interface RiskScoreAnalysis {
  applicationId: string;
  overallScore: number; // 1-10 (1 = very low risk, 10 = very high risk)
  riskLevel: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  components: RiskScoreComponents;
  riskFactors: string[];
  mitigatingFactors: string[];
  justification: string;
  recommendations: string[];
  confidence: number; // 0-1
  calculatedAt: Date;
}

export class RiskScorerService {
  private readonly SYSTEM_PROMPT = `You are a senior lending risk analyst with 20+ years of experience. Assess lending risk based on business information, financial data, document analysis, and banking history.

Provide a risk score from 1-10:
1-2: Very Low Risk (Excellent creditworthy borrower)
3-4: Low Risk (Strong borrower with minor concerns)
5-6: Medium Risk (Acceptable borrower with moderate risks)
7-8: High Risk (Elevated risk requiring enhanced terms)
9-10: Very High Risk (Significant risk, likely decline)

Consider: business stability, financial performance, documentation quality, banking behavior, compliance issues, and market conditions.`;

  // Main function to generate comprehensive risk score
  async generateRiskScore(applicationId: string): Promise<RiskScoreAnalysis> {
    try {
      console.log(`[RISK-SCORER] Analyzing risk for application ${applicationId}`);

      // Gather comprehensive application data
      const applicationData = await this.gatherApplicationData(applicationId);

      // Calculate component scores
      const components = await this.calculateComponentScores(applicationData);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(components);

      // Determine risk level
      const riskLevel = this.determineRiskLevel(overallScore);

      // Generate AI analysis
      const aiAnalysis = await this.generateAIAnalysis(applicationData, components, overallScore);

      // Calculate confidence
      const confidence = this.calculateConfidence(applicationData);

      const riskAnalysis: RiskScoreAnalysis = {
        applicationId,
        overallScore,
        riskLevel,
        components,
        riskFactors: aiAnalysis.riskFactors,
        mitigatingFactors: aiAnalysis.mitigatingFactors,
        justification: aiAnalysis.justification,
        recommendations: aiAnalysis.recommendations,
        confidence,
        calculatedAt: new Date()
      };

      console.log(`[RISK-SCORER] Risk score calculated: ${overallScore}/10 (${riskLevel})`);

      return riskAnalysis;

    } catch (error) {
      console.error('[RISK-SCORER] Error calculating risk score:', error);
      throw error;
    }
  }

  // Gather all data needed for risk assessment
  private async gatherApplicationData(applicationId: string): Promise<any> {
    // Get application
    const app = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (app.length === 0) {
      throw new Error('Application not found');
    }

    const application = app[0];

    // Get documents
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId));

    // Gather analysis results with error handling
    let fieldAggregation, discrepancyReport, bankingAnalysis;

    try {
      fieldAggregation = await fieldAggregatorService.aggregateOCRFields(applicationId);
    } catch (error) {
      console.warn('[RISK-SCORER] Field aggregation failed:', error);
      fieldAggregation = { conflicts: [], documentsSummary: { documentsProcessed: 0 } };
    }

    try {
      discrepancyReport = await discrepancyCheckerService.compareFieldsToApplication(applicationId);
    } catch (error) {
      console.warn('[RISK-SCORER] Discrepancy check failed:', error);
      discrepancyReport = { discrepancies: [], overallRisk: 'medium' };
    }

    // Get banking analysis
    try {
      const bankingDocs = docs.filter(doc => 
        (doc.documentType || '').toLowerCase().includes('bank') ||
        (doc.fileName || '').toLowerCase().includes('statement')
      );

      if (bankingDocs.length > 0) {
        bankingAnalysis = await bankingAnalyzerService.analyzeBankingStatement(bankingDocs[0].id);
      }
    } catch (error) {
      console.warn('[RISK-SCORER] Banking analysis failed:', error);
      bankingAnalysis = null;
    }

    return {
      application,
      documents: docs,
      fieldAggregation,
      discrepancyReport,
      bankingAnalysis
    };
  }

  // Calculate individual risk component scores
  private async calculateComponentScores(data: any): Promise<RiskScoreComponents> {
    const businessRisk = this.calculateBusinessRisk(data.application);
    const financialRisk = this.calculateFinancialRisk(data.application, data.fieldAggregation);
    const documentRisk = this.calculateDocumentRisk(data.documents, data.discrepancyReport);
    const bankingRisk = this.calculateBankingRisk(data.bankingAnalysis);
    const complianceRisk = this.calculateComplianceRisk(data.application, data.fieldAggregation);

    return {
      businessRisk,
      financialRisk,
      documentRisk,
      bankingRisk,
      complianceRisk
    };
  }

  // Calculate business risk (0-10)
  private calculateBusinessRisk(application: any): number {
    let risk = 5; // Base risk

    // Time in business
    if (application.timeInBusiness) {
      if (application.timeInBusiness >= 60) risk -= 2; // 5+ years
      else if (application.timeInBusiness >= 24) risk -= 1; // 2+ years
      else if (application.timeInBusiness < 12) risk += 2; // Less than 1 year
    }

    // Industry risk (simplified)
    const highRiskIndustries = ['construction', 'restaurant', 'retail'];
    const industry = (application.industry || '').toLowerCase();
    if (highRiskIndustries.some(h => industry.includes(h))) {
      risk += 1;
    }

    // Loan size relative to business age
    if (application.amountRequested && application.timeInBusiness) {
      const monthlyRisk = application.amountRequested / (application.timeInBusiness || 1);
      if (monthlyRisk > 10000) risk += 1; // High loan relative to business age
    }

    return Math.max(0, Math.min(10, risk));
  }

  // Calculate financial risk (0-10)
  private calculateFinancialRisk(application: any, fieldAggregation: any): number {
    let risk = 5; // Base risk

    // Monthly revenue analysis
    if (application.monthlyRevenue) {
      if (application.monthlyRevenue >= 100000) risk -= 2; // Strong revenue
      else if (application.monthlyRevenue >= 50000) risk -= 1; // Good revenue
      else if (application.monthlyRevenue < 10000) risk += 2; // Low revenue
    } else {
      risk += 1; // No revenue information
    }

    // Debt-to-income ratio (simplified)
    if (application.amountRequested && application.monthlyRevenue) {
      const monthlyPayment = application.amountRequested / 60; // Assume 5-year term
      const ratio = monthlyPayment / (application.monthlyRevenue || 1);
      
      if (ratio > 0.3) risk += 2; // High debt service ratio
      else if (ratio > 0.2) risk += 1; // Moderate ratio
      else if (ratio < 0.1) risk -= 1; // Low ratio
    }

    // Revenue growth (from aggregated fields)
    if (fieldAggregation?.consensusFields) {
      const lastYear = fieldAggregation.consensusFields['Revenue Last Year'];
      const ytd = fieldAggregation.consensusFields['Revenue YTD'];
      
      if (lastYear && ytd) {
        // Simplified growth calculation
        const growth = (parseFloat(ytd) / parseFloat(lastYear)) - 1;
        if (growth > 0.2) risk -= 1; // Strong growth
        else if (growth < -0.1) risk += 1; // Declining revenue
      }
    }

    return Math.max(0, Math.min(10, risk));
  }

  // Calculate document risk (0-10)
  private calculateDocumentRisk(documents: any[], discrepancyReport: any): number {
    let risk = 5; // Base risk

    // Document quantity
    if (documents.length >= 5) risk -= 1; // Good documentation
    else if (documents.length < 3) risk += 2; // Poor documentation

    // Document discrepancies
    const discrepancies = discrepancyReport?.discrepancies || [];
    risk += Math.min(3, discrepancies.length * 0.5); // Each discrepancy adds risk

    // Overall discrepancy risk level
    switch (discrepancyReport?.overallRisk) {
      case 'low': risk -= 1; break;
      case 'high': risk += 1; break;
      case 'critical': risk += 2; break;
    }

    return Math.max(0, Math.min(10, risk));
  }

  // Calculate banking risk (0-10)
  private calculateBankingRisk(bankingAnalysis: any): number {
    if (!bankingAnalysis) return 6; // Higher risk if no banking data

    let risk = 5; // Base risk
    const summary = bankingAnalysis.overallSummary;

    if (summary) {
      // NSF incidents
      if (summary.totalNSFIncidents === 0) risk -= 1;
      else if (summary.totalNSFIncidents >= 3) risk += 2;
      else if (summary.totalNSFIncidents >= 1) risk += 1;

      // Overdraft frequency
      if (summary.overdraftFrequency > 20) risk += 2; // Frequent overdrafts
      else if (summary.overdraftFrequency > 10) risk += 1;
      else if (summary.overdraftFrequency < 5) risk -= 1;

      // Cash flow trend
      switch (summary.cashflowTrend) {
        case 'improving': risk -= 1; break;
        case 'declining': risk += 2; break;
      }

      // Average balance
      if (summary.averageMonthlyBalance > 50000) risk -= 1;
      else if (summary.averageMonthlyBalance < 5000) risk += 1;
    }

    return Math.max(0, Math.min(10, risk));
  }

  // Calculate compliance risk (0-10)
  private calculateComplianceRisk(application: any, fieldAggregation: any): number {
    let risk = 3; // Base compliance risk (lower baseline)

    // GST number verification
    const gstNumber = fieldAggregation?.consensusFields?.['GST Number'] || application.gstNumber;
    if (!gstNumber) risk += 1; // Missing GST number

    // Business registration
    if (!application.legalBusinessName) risk += 1;

    // Use of funds clarity
    if (!application.useOfFunds || application.useOfFunds.length < 10) {
      risk += 1; // Vague use of funds
    }

    return Math.max(0, Math.min(10, risk));
  }

  // Calculate overall weighted score
  private calculateOverallScore(components: RiskScoreComponents): number {
    // Weighted average of components
    const weights = {
      businessRisk: 0.25,
      financialRisk: 0.30,
      documentRisk: 0.20,
      bankingRisk: 0.20,
      complianceRisk: 0.05
    };

    const weightedScore = 
      components.businessRisk * weights.businessRisk +
      components.financialRisk * weights.financialRisk +
      components.documentRisk * weights.documentRisk +
      components.bankingRisk * weights.bankingRisk +
      components.complianceRisk * weights.complianceRisk;

    return Math.round(weightedScore * 10) / 10; // Round to 1 decimal
  }

  // Determine risk level category
  private determineRiskLevel(score: number): RiskScoreAnalysis['riskLevel'] {
    if (score <= 2) return 'very-low';
    if (score <= 4) return 'low';
    if (score <= 6) return 'medium';
    if (score <= 8) return 'high';
    return 'very-high';
  }

  // Generate AI-powered analysis and justification
  private async generateAIAnalysis(
    data: any, 
    components: RiskScoreComponents, 
    overallScore: number
  ): Promise<{
    riskFactors: string[];
    mitigatingFactors: string[];
    justification: string;
    recommendations: string[];
  }> {
    try {
      const prompt = `Analyze this loan application risk assessment:

APPLICATION DATA:
- Business: ${data.application.legalBusinessName || 'Unknown'}
- Amount: $${data.application.amountRequested?.toLocaleString() || 'Unknown'}
- Time in Business: ${data.application.timeInBusiness || 'Unknown'} months
- Monthly Revenue: $${data.application.monthlyRevenue?.toLocaleString() || 'Unknown'}

RISK COMPONENT SCORES (0-10):
- Business Risk: ${components.businessRisk}
- Financial Risk: ${components.financialRisk}
- Document Risk: ${components.documentRisk}
- Banking Risk: ${components.bankingRisk}
- Compliance Risk: ${components.complianceRisk}

OVERALL RISK SCORE: ${overallScore}/10

ANALYSIS RESULTS:
- Documents: ${data.documents.length} submitted
- Discrepancies: ${data.discrepancyReport?.discrepancies?.length || 0}
- NSF Incidents: ${data.bankingAnalysis?.overallSummary?.totalNSFIncidents || 'Unknown'}

Provide analysis in JSON format:
{
  "riskFactors": ["specific risk factor 1", "risk factor 2"],
  "mitigatingFactors": ["positive factor 1", "positive factor 2"],
  "justification": "Clear explanation of the risk score",
  "recommendations": ["specific recommendation 1", "recommendation 2"]
}

Focus on specific, actionable insights for lending decisions.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: this.SYSTEM_PROMPT
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.2
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        riskFactors: result.riskFactors || ['AI analysis unavailable'],
        mitigatingFactors: result.mitigatingFactors || [],
        justification: result.justification || 'Risk score calculated using component analysis',
        recommendations: result.recommendations || ['Standard lending review recommended']
      };

    } catch (error) {
      console.error('[RISK-SCORER] AI analysis failed:', error);
      return {
        riskFactors: ['AI analysis failed - manual review required'],
        mitigatingFactors: [],
        justification: `Risk score ${overallScore}/10 calculated using quantitative component analysis`,
        recommendations: ['Conduct manual risk review due to AI analysis failure']
      };
    }
  }

  // Calculate confidence in risk assessment
  private calculateConfidence(data: any): number {
    let confidence = 0.4; // Base confidence

    // Data availability
    if (data.application.monthlyRevenue) confidence += 0.1;
    if (data.application.timeInBusiness) confidence += 0.1;
    if (data.documents.length >= 3) confidence += 0.1;
    if (data.documents.length >= 5) confidence += 0.1;
    if (data.bankingAnalysis) confidence += 0.1;
    if (data.fieldAggregation?.documentsSummary?.documentsProcessed > 0) confidence += 0.1;

    return Math.min(1, confidence);
  }

  // Generate simple heuristic score when AI fails
  generateHeuristicScore(applicationId: string, basicData: any): RiskScoreAnalysis {
    // Simplified scoring based on available data
    let score = 5; // Default medium risk

    if (basicData.timeInBusiness < 12) score += 2;
    if (basicData.amountRequested > 100000) score += 1;
    if (!basicData.monthlyRevenue) score += 1;

    score = Math.max(1, Math.min(10, score));

    return {
      applicationId,
      overallScore: score,
      riskLevel: this.determineRiskLevel(score),
      components: {
        businessRisk: score,
        financialRisk: score,
        documentRisk: score,
        bankingRisk: score,
        complianceRisk: score
      },
      riskFactors: ['Limited data available for analysis'],
      mitigatingFactors: [],
      justification: 'Heuristic scoring due to limited data availability',
      recommendations: ['Gather additional financial documentation'],
      confidence: 0.3,
      calculatedAt: new Date()
    };
  }
}

export const riskScorerService = new RiskScorerService();