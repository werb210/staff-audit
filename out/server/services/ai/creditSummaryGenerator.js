import OpenAI from "openai";
import { db } from '../../db';
import { applications, documents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { fieldAggregatorService } from './aggregateFields';
import { pdfWriterService } from '../pdf/pdfWriter';
import { discrepancyCheckerService } from './discrepancyChecker';
import { bankingAnalyzerService } from './bankingAnalyzer';
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export class CreditSummaryGeneratorService {
    SYSTEM_PROMPT = `You are a senior credit analyst preparing executive credit summaries for lending decisions. Create a comprehensive, professional one-page credit summary that includes:

1. BUSINESS OVERVIEW - Company description, industry, key metrics
2. REQUESTED FUNDING - Amount, purpose, repayment terms
3. FINANCIAL SNAPSHOT - Revenue, profitability, cash flow, ratios
4. RISK ASSESSMENT - Key risks, mitigation factors, overall risk rating
5. RECOMMENDATION - Clear lending recommendation with conditions

Format the output in clean, professional markdown. Be concise but thorough. Focus on decision-relevant information for senior lenders.`;
    // Main function to generate credit summary
    async generateCreditSummary(applicationId) {
        try {
            console.log(`[CREDIT-SUMMARY] Generating summary for application ${applicationId}`);
            // Gather comprehensive data
            const summaryData = await this.gatherApplicationData(applicationId);
            // Generate AI summary
            const summaryText = await this.generateAISummary(summaryData);
            // Generate PDF
            const pdfBuffer = await this.generatePDF(summaryText, summaryData);
            // Create metadata
            const metadata = this.createMetadata(summaryData);
            const creditSummary = {
                applicationId,
                summaryText,
                pdfBuffer,
                metadata
            };
            console.log(`[CREDIT-SUMMARY] Generated summary for ${summaryData.businessName}`);
            return creditSummary;
        }
        catch (error) {
            console.error('[CREDIT-SUMMARY] Error generating credit summary:', error);
            throw error;
        }
    }
    // Gather all application data for analysis
    async gatherApplicationData(applicationId) {
        try {
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
            // Gather analysis results (with error handling)
            let fieldAggregation, discrepancyReport, bankingAnalysis;
            try {
                fieldAggregation = await fieldAggregatorService.aggregateOCRFields(applicationId);
            }
            catch (error) {
                console.warn('[CREDIT-SUMMARY] Field aggregation failed:', error);
                fieldAggregation = { fieldMap: {}, conflicts: [], consensusFields: {} };
            }
            try {
                discrepancyReport = await discrepancyCheckerService.compareFieldsToApplication(applicationId);
            }
            catch (error) {
                console.warn('[CREDIT-SUMMARY] Discrepancy check failed:', error);
                discrepancyReport = { discrepancies: [], overallRisk: 'medium' };
            }
            // Get banking analysis from documents
            try {
                const bankingDocs = docs.filter(doc => (doc.documentType || '').toLowerCase().includes('bank') ||
                    (doc.fileName || '').toLowerCase().includes('statement'));
                if (bankingDocs.length > 0) {
                    bankingAnalysis = await bankingAnalyzerService.analyzeBankingStatement(bankingDocs[0].id);
                }
            }
            catch (error) {
                console.warn('[CREDIT-SUMMARY] Banking analysis failed:', error);
                bankingAnalysis = null;
            }
            // Extract financial highlights
            const financialHighlights = this.extractFinancialHighlights(application, fieldAggregation);
            // Identify risk factors
            const riskFactors = this.identifyRiskFactors(application, discrepancyReport, bankingAnalysis);
            // Generate recommendations
            const recommendations = this.generateRecommendations(application, riskFactors, financialHighlights);
            return {
                applicationId,
                businessName: application.legalBusinessName || 'Unknown Business',
                amountRequested: application.amountRequested || 0,
                useOfFunds: application.useOfFunds || 'Not specified',
                applicantName: `${application.firstName || ''} ${application.lastName || ''}`.trim(),
                documentInsights: { documentCount: docs.length },
                fieldAggregation,
                discrepancyReport,
                bankingAnalysis,
                financialHighlights,
                riskFactors,
                recommendations
            };
        }
        catch (error) {
            console.error('[CREDIT-SUMMARY] Error gathering application data:', error);
            throw error;
        }
    }
    // Generate AI-powered summary
    async generateAISummary(data) {
        try {
            const prompt = `Generate a professional credit summary for this loan application:

APPLICATION DETAILS:
- Business: ${data.businessName}
- Applicant: ${data.applicantName}
- Amount Requested: $${data.amountRequested?.toLocaleString() || 'Not specified'}
- Use of Funds: ${data.useOfFunds}

DOCUMENT ANALYSIS:
- Documents Submitted: ${data.documentInsights?.documentCount || 0}
- Field Conflicts: ${data.discrepancyReport?.discrepancies?.length || 0}
- Overall Risk Level: ${data.discrepancyReport?.overallRisk || 'medium'}

FINANCIAL HIGHLIGHTS:
${JSON.stringify(data.financialHighlights, null, 2)}

BANKING ANALYSIS:
${data.bankingAnalysis ? JSON.stringify({
                monthlyStats: data.bankingAnalysis.monthlyStats?.length || 0,
                overallSummary: data.bankingAnalysis.overallSummary,
                insights: data.bankingAnalysis.insights
            }, null, 2) : 'No banking analysis available'}

RISK FACTORS:
${data.riskFactors.map(risk => `- ${risk}`).join('\n')}

RECOMMENDATIONS:
${data.recommendations.map(rec => `- ${rec}`).join('\n')}

Create a professional, one-page credit summary in markdown format with clear sections for Business Overview, Requested Funding, Financial Snapshot, Risk Assessment, and Recommendation.`;
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
                max_tokens: 1200,
                temperature: 0.3
            });
            return response.choices[0].message.content || 'Error generating summary';
        }
        catch (error) {
            console.error('[CREDIT-SUMMARY] AI summary generation failed:', error);
            return this.generateFallbackSummary(data);
        }
    }
    // Generate fallback summary when AI fails
    generateFallbackSummary(data) {
        return `# Credit Summary: ${data.businessName}

## Business Overview
- **Business Name**: ${data.businessName}
- **Applicant**: ${data.applicantName}
- **Documents Submitted**: ${data.documentInsights?.documentCount || 0}

## Requested Funding
- **Amount**: $${data.amountRequested?.toLocaleString() || 'Not specified'}
- **Use of Funds**: ${data.useOfFunds}

## Risk Assessment
- **Document Conflicts**: ${data.discrepancyReport?.discrepancies?.length || 0}
- **Overall Risk**: ${data.discrepancyReport?.overallRisk || 'Medium'}

## Risk Factors
${data.riskFactors.map(risk => `- ${risk}`).join('\n')}

## Recommendations
${data.recommendations.map(rec => `- ${rec}`).join('\n')}

*Note: AI summary generation failed - manual review required*`;
    }
    // Generate PDF from summary
    async generatePDF(summaryText, data) {
        try {
            const pdfOptions = {
                header: `Credit Summary - ${data.businessName}`,
                footer: `Application ID: ${data.applicationId} | Generated: ${new Date().toLocaleDateString()}`,
                title: `Credit Summary - ${data.businessName}`,
                author: 'Boreal Financial - AI Credit Analysis',
                subject: 'Loan Application Credit Summary'
            };
            return await pdfWriterService.generatePDFFromMarkdown(summaryText, pdfOptions);
        }
        catch (error) {
            console.error('[CREDIT-SUMMARY] PDF generation failed:', error);
            throw new Error('Failed to generate PDF summary');
        }
    }
    // Extract financial highlights from application and insights
    extractFinancialHighlights(application, fieldAggregation) {
        const highlights = {};
        // From application
        if (application.monthlyRevenue) {
            highlights.monthlyRevenue = application.monthlyRevenue;
            highlights.annualRevenue = application.monthlyRevenue * 12;
        }
        if (application.timeInBusiness) {
            highlights.timeInBusiness = application.timeInBusiness;
        }
        // From consensus fields
        if (fieldAggregation?.consensusFields) {
            const consensus = fieldAggregation.consensusFields;
            if (consensus['Revenue Last Year']) {
                highlights.lastYearRevenue = consensus['Revenue Last Year'];
            }
            if (consensus['Revenue YTD']) {
                highlights.ytdRevenue = consensus['Revenue YTD'];
            }
        }
        return highlights;
    }
    // Identify risk factors
    identifyRiskFactors(application, discrepancyReport, bankingAnalysis) {
        const risks = [];
        // Application-based risks
        if (application.amountRequested > 100000) {
            risks.push('Large loan amount requires enhanced due diligence');
        }
        if (application.timeInBusiness && application.timeInBusiness < 24) {
            risks.push('Limited business operating history');
        }
        // Discrepancy-based risks
        if (discrepancyReport?.discrepancies?.length > 0) {
            risks.push(`${discrepancyReport.discrepancies.length} document discrepancies identified`);
        }
        if (discrepancyReport?.overallRisk === 'high' || discrepancyReport?.overallRisk === 'critical') {
            risks.push('High risk level identified in document analysis');
        }
        // Banking-based risks
        if (bankingAnalysis?.overallSummary) {
            const banking = bankingAnalysis.overallSummary;
            if (banking.totalNSFIncidents > 0) {
                risks.push(`${banking.totalNSFIncidents} NSF incidents in banking history`);
            }
            if (banking.overdraftFrequency > 15) {
                risks.push('High overdraft frequency indicates cash flow challenges');
            }
            if (banking.cashflowTrend === 'declining') {
                risks.push('Declining cash flow trend identified');
            }
        }
        return risks;
    }
    // Generate recommendations
    generateRecommendations(application, riskFactors, financialHighlights) {
        const recommendations = [];
        // Risk-based recommendations
        if (riskFactors.length === 0) {
            recommendations.push('Low risk profile supports standard loan approval');
        }
        else if (riskFactors.length <= 2) {
            recommendations.push('Moderate risk - proceed with standard conditions');
        }
        else {
            recommendations.push('High risk profile - consider additional security or guarantees');
        }
        // Amount-based recommendations
        if (application.amountRequested > 250000) {
            recommendations.push('Large loan amount - require updated financial statements');
        }
        // Business maturity recommendations
        if (application.timeInBusiness && application.timeInBusiness < 12) {
            recommendations.push('New business - require personal guarantees');
        }
        // Financial performance recommendations
        if (financialHighlights.monthlyRevenue && financialHighlights.monthlyRevenue > 50000) {
            recommendations.push('Strong revenue supports lending decision');
        }
        // General recommendations
        recommendations.push('Monitor performance against projections quarterly');
        return recommendations;
    }
    // Create summary metadata
    createMetadata(data) {
        // Determine risk level
        let riskLevel = 'medium';
        if (data.riskFactors.length === 0) {
            riskLevel = 'low';
        }
        else if (data.riskFactors.length <= 2) {
            riskLevel = 'medium';
        }
        else if (data.riskFactors.length <= 4) {
            riskLevel = 'high';
        }
        else {
            riskLevel = 'critical';
        }
        // Calculate analysis confidence
        let confidence = 0.5; // Base confidence
        if (data.documentInsights.documentCount >= 3)
            confidence += 0.2;
        if (data.documentInsights.documentCount >= 5)
            confidence += 0.1;
        if (data.discrepancyReport?.discrepancies?.length === 0)
            confidence += 0.1;
        if (data.bankingAnalysis)
            confidence += 0.1;
        return {
            businessName: data.businessName,
            amountRequested: data.amountRequested,
            riskLevel,
            generatedAt: new Date(),
            documentCount: data.documentInsights.documentCount,
            analysisConfidence: Math.min(1, confidence)
        };
    }
}
export const creditSummaryGeneratorService = new CreditSummaryGeneratorService();
