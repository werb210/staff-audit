import OpenAI from "openai";
import { db } from '../../db';
import { documents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { documentInsightsService } from './documentInsights';
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export class ProjectionGeneratorService {
    SYSTEM_PROMPT = `You are a senior financial analyst specializing in business projections for lending purposes. Analyze financial statements, bank statements, and business documents to create realistic, data-driven financial projections.

Key responsibilities:
1. Extract historical financial trends
2. Assess business growth potential and risks
3. Generate conservative but realistic projections
4. Consider industry standards and market conditions
5. Provide lending-focused insights and recommendations

Be thorough, realistic, and conservative in your analysis.`;
    // Main function to generate financial projections
    async generateFinancialProjections(applicationId) {
        try {
            console.log(`[PROJECTION-GENERATOR] Starting financial projections for application ${applicationId}`);
            // Get financial documents for this application
            const docs = await db
                .select()
                .from(documents)
                .where(eq(documents.applicationId, applicationId));
            const financialDocs = this.filterFinancialDocuments(docs);
            if (financialDocs.length === 0) {
                return this.generateBasicProjections(applicationId);
            }
            // Extract financial data from documents
            const financialData = await this.extractFinancialData(financialDocs);
            // Generate baseline analysis
            const baselineData = await this.analyzeBaselineFinancials(financialData);
            // Create assumptions
            const assumptions = await this.generateAssumptions(financialData, baselineData);
            // Generate projections
            const oneYearProjection = await this.generateOneYearProjection(baselineData, assumptions);
            const threeYearProjections = await this.generateThreeYearProjections(baselineData, assumptions);
            // Generate insights and analysis
            const insights = await this.generateInsights(baselineData, oneYearProjection, threeYearProjections);
            const riskFactors = await this.identifyRiskFactors(financialData, assumptions);
            const recommendations = await this.generateRecommendations(insights, riskFactors);
            // Scenario analysis
            const scenarioAnalysis = this.generateScenarioAnalysis(oneYearProjection, assumptions);
            // Calculate confidence
            const confidence = this.calculateConfidence(financialDocs, baselineData);
            const projections = {
                applicationId,
                baselineData,
                assumptions,
                oneYearProjection,
                threeYearProjections,
                keyInsights: insights,
                riskFactors,
                recommendations,
                scenarioAnalysis,
                confidence,
                generatedAt: new Date()
            };
            console.log(`[PROJECTION-GENERATOR] Completed projections with ${confidence * 100}% confidence`);
            return projections;
        }
        catch (error) {
            console.error('[PROJECTION-GENERATOR] Error generating projections:', error);
            throw error;
        }
    }
    // Filter documents to financial ones only
    filterFinancialDocuments(docs) {
        return docs.filter(doc => {
            const type = (doc.documentType || doc.fileName || '').toLowerCase();
            return (type.includes('financial') ||
                type.includes('income') ||
                type.includes('balance') ||
                type.includes('cashflow') ||
                type.includes('statement') ||
                type.includes('tax') ||
                type.includes('bank') ||
                type.includes('revenue') ||
                type.includes('profit'));
        });
    }
    // Extract financial data from documents
    async extractFinancialData(docs) {
        let combinedFinancialText = '';
        for (const doc of docs) {
            try {
                const text = await documentInsightsService.extractTextFromPDF(doc.filePath || doc.storageKey || '');
                if (text) {
                    combinedFinancialText += `\n---\n**${doc.documentType || doc.fileName}**\n${text}\n`;
                }
            }
            catch (error) {
                console.error(`[PROJECTION-GENERATOR] Failed to extract text from document ${doc.id}:`, error);
            }
        }
        return combinedFinancialText;
    }
    // Analyze baseline financial performance
    async analyzeBaselineFinancials(financialData) {
        try {
            const prompt = `Analyze these financial documents and extract baseline financial metrics:

${financialData.substring(0, 4000)}${financialData.length > 4000 ? '...' : ''}

Extract and calculate:
{
  "currentRevenue": 0,
  "historicalGrowthRate": 0,
  "currentMargins": 0,
  "currentExpenses": 0,
  "currentCashFlow": 0
}

Provide actual numbers in CAD. For growth rate, use percentage (e.g., 15 for 15%).`;
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
                max_tokens: 600,
                temperature: 0.2
            });
            const result = JSON.parse(response.choices[0].message.content || '{}');
            return {
                currentRevenue: Math.max(0, result.currentRevenue || 0),
                historicalGrowthRate: Math.max(-50, Math.min(100, result.historicalGrowthRate || 5)),
                currentMargins: Math.max(0, Math.min(100, result.currentMargins || 20)),
                currentExpenses: Math.max(0, result.currentExpenses || 0),
                currentCashFlow: result.currentCashFlow || 0
            };
        }
        catch (error) {
            console.error('[PROJECTION-GENERATOR] Baseline analysis failed:', error);
            return {
                currentRevenue: 0,
                historicalGrowthRate: 5,
                currentMargins: 20,
                currentExpenses: 0,
                currentCashFlow: 0
            };
        }
    }
    // Generate projection assumptions
    async generateAssumptions(financialData, baseline) {
        try {
            const prompt = `Based on this financial data and baseline metrics, generate realistic business assumptions:

Baseline Data:
- Current Revenue: $${baseline.currentRevenue.toLocaleString()}
- Historical Growth: ${baseline.historicalGrowthRate}%
- Current Margins: ${baseline.currentMargins}%

Financial Data:
${financialData.substring(0, 2000)}

Generate conservative assumptions:
{
  "revenueGrowthRate": 5,
  "grossMarginTrend": "stable",
  "expenseGrowthRate": 3,
  "seasonalityFactor": 0.1,
  "marketConditions": "neutral",
  "businessMaturity": "growth",
  "industryTrends": ["trend1", "trend2"],
  "keyRisks": ["risk1", "risk2"]
}`;
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: "You are a conservative financial analyst. Generate realistic, achievable assumptions for lending purposes."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 600,
                temperature: 0.3
            });
            const result = JSON.parse(response.choices[0].message.content || '{}');
            return {
                revenueGrowthRate: Math.max(-10, Math.min(50, result.revenueGrowthRate || 5)),
                grossMarginTrend: ['improving', 'stable', 'declining'].includes(result.grossMarginTrend)
                    ? result.grossMarginTrend : 'stable',
                expenseGrowthRate: Math.max(0, Math.min(25, result.expenseGrowthRate || 3)),
                seasonalityFactor: Math.max(0, Math.min(1, result.seasonalityFactor || 0.1)),
                marketConditions: ['favorable', 'neutral', 'challenging'].includes(result.marketConditions)
                    ? result.marketConditions : 'neutral',
                businessMaturity: ['startup', 'growth', 'mature'].includes(result.businessMaturity)
                    ? result.businessMaturity : 'growth',
                industryTrends: Array.isArray(result.industryTrends) ? result.industryTrends : [],
                keyRisks: Array.isArray(result.keyRisks) ? result.keyRisks : []
            };
        }
        catch (error) {
            console.error('[PROJECTION-GENERATOR] Assumptions generation failed:', error);
            return {
                revenueGrowthRate: 5,
                grossMarginTrend: 'stable',
                expenseGrowthRate: 3,
                seasonalityFactor: 0.1,
                marketConditions: 'neutral',
                businessMaturity: 'growth',
                industryTrends: [],
                keyRisks: ['Limited financial history']
            };
        }
    }
    // Generate one-year projection
    async generateOneYearProjection(baseline, assumptions) {
        const revenue = baseline.currentRevenue * (1 + assumptions.revenueGrowthRate / 100);
        // Calculate margins based on trend
        let marginAdjustment = 0;
        switch (assumptions.grossMarginTrend) {
            case 'improving':
                marginAdjustment = 2;
                break;
            case 'declining':
                marginAdjustment = -2;
                break;
            default: marginAdjustment = 0;
        }
        const grossMargin = Math.max(5, Math.min(80, baseline.currentMargins + marginAdjustment));
        const grossProfit = revenue * (grossMargin / 100);
        const operatingExpenses = baseline.currentExpenses * (1 + assumptions.expenseGrowthRate / 100);
        const netIncome = grossProfit - operatingExpenses;
        const cashFlow = netIncome * 0.85; // Assume 85% cash conversion
        // Estimate working capital components
        const accountsReceivable = revenue * 0.15; // 15% of revenue
        const accountsPayable = operatingExpenses * 0.12; // 12% of expenses
        const workingCapital = accountsReceivable - accountsPayable;
        const capex = revenue * 0.05; // 5% of revenue for capital expenditures
        const debtServiceCoverage = cashFlow / Math.max(1, revenue * 0.1); // Assume 10% debt service
        return {
            year: 1,
            revenue,
            grossProfit,
            operatingExpenses,
            netIncome,
            cashFlow,
            accountsReceivable,
            accountsPayable,
            workingCapital,
            capex,
            debtServiceCoverage
        };
    }
    // Generate three-year projections
    async generateThreeYearProjections(baseline, assumptions) {
        const projections = [];
        // Gradually declining growth rates
        const growthRates = [
            assumptions.revenueGrowthRate,
            assumptions.revenueGrowthRate * 0.8,
            assumptions.revenueGrowthRate * 0.6
        ];
        let baseRevenue = baseline.currentRevenue;
        let baseExpenses = baseline.currentExpenses;
        for (let year = 1; year <= 3; year++) {
            const growthRate = growthRates[year - 1];
            const revenue = baseRevenue * (1 + growthRate / 100);
            // Margin improvement/decline over time
            let marginAdjustment = 0;
            switch (assumptions.grossMarginTrend) {
                case 'improving':
                    marginAdjustment = year * 1;
                    break;
                case 'declining':
                    marginAdjustment = -year * 1;
                    break;
                default: marginAdjustment = 0;
            }
            const grossMargin = Math.max(5, Math.min(80, baseline.currentMargins + marginAdjustment));
            const grossProfit = revenue * (grossMargin / 100);
            const operatingExpenses = baseExpenses * Math.pow(1 + assumptions.expenseGrowthRate / 100, year);
            const netIncome = grossProfit - operatingExpenses;
            const cashFlow = netIncome * 0.85;
            const accountsReceivable = revenue * 0.15;
            const accountsPayable = operatingExpenses * 0.12;
            const workingCapital = accountsReceivable - accountsPayable;
            const capex = revenue * 0.05;
            const debtServiceCoverage = cashFlow / Math.max(1, revenue * 0.1);
            projections.push({
                year,
                revenue,
                grossProfit,
                operatingExpenses,
                netIncome,
                cashFlow,
                accountsReceivable,
                accountsPayable,
                workingCapital,
                capex,
                debtServiceCoverage
            });
            baseRevenue = revenue;
        }
        return projections;
    }
    // Generate insights from projections
    async generateInsights(baseline, oneYear, threeYear) {
        const insights = [];
        // Revenue growth analysis
        const year1Growth = ((oneYear.revenue - baseline.currentRevenue) / baseline.currentRevenue) * 100;
        const year3Growth = ((threeYear[2].revenue - baseline.currentRevenue) / baseline.currentRevenue) * 100;
        insights.push(`Projected revenue growth: ${year1Growth.toFixed(1)}% in Year 1, ${year3Growth.toFixed(1)}% cumulative over 3 years`);
        // Profitability analysis
        const year1Margin = (oneYear.netIncome / oneYear.revenue) * 100;
        const year3Margin = (threeYear[2].netIncome / threeYear[2].revenue) * 100;
        insights.push(`Net profit margin projection: ${year1Margin.toFixed(1)}% in Year 1, ${year3Margin.toFixed(1)}% in Year 3`);
        // Cash flow analysis
        if (oneYear.cashFlow > 0) {
            insights.push(`Positive cash flow projected: $${oneYear.cashFlow.toLocaleString()} in Year 1`);
        }
        else {
            insights.push(`Cash flow challenges projected: $${oneYear.cashFlow.toLocaleString()} in Year 1`);
        }
        // Debt service capacity
        if (oneYear.debtServiceCoverage > 1.25) {
            insights.push(`Strong debt service capacity: ${oneYear.debtServiceCoverage.toFixed(2)}x coverage ratio`);
        }
        else if (oneYear.debtServiceCoverage > 1.0) {
            insights.push(`Adequate debt service capacity: ${oneYear.debtServiceCoverage.toFixed(2)}x coverage ratio`);
        }
        else {
            insights.push(`Potential debt service concerns: ${oneYear.debtServiceCoverage.toFixed(2)}x coverage ratio`);
        }
        return insights;
    }
    // Identify risk factors
    async identifyRiskFactors(financialData, assumptions) {
        const risks = [];
        // Growth rate risks
        if (assumptions.revenueGrowthRate > 25) {
            risks.push('Aggressive growth assumptions may be difficult to achieve');
        }
        // Market condition risks
        if (assumptions.marketConditions === 'challenging') {
            risks.push('Challenging market conditions may impact performance');
        }
        // Business maturity risks
        if (assumptions.businessMaturity === 'startup') {
            risks.push('Early-stage business with higher execution risk');
        }
        // Add assumption-based risks
        risks.push(...assumptions.keyRisks);
        return risks;
    }
    // Generate recommendations
    async generateRecommendations(insights, risks) {
        const recommendations = [];
        // Based on insights and risks
        if (risks.length > 3) {
            recommendations.push('Consider additional security or guarantees due to identified risks');
        }
        if (insights.some(insight => insight.includes('Positive cash flow'))) {
            recommendations.push('Strong cash flow projections support lending decision');
        }
        if (risks.some(risk => risk.includes('startup') || risk.includes('early-stage'))) {
            recommendations.push('Require personal guarantees for early-stage business');
        }
        recommendations.push('Monitor actual performance against projections quarterly');
        recommendations.push('Review and update projections annually');
        return recommendations;
    }
    // Generate scenario analysis
    generateScenarioAnalysis(oneYear, assumptions) {
        // Optimistic scenario: +20% revenue, improved margins
        const optimisticRevenue = oneYear.revenue * 1.2;
        const optimisticProfit = oneYear.netIncome * 1.4;
        // Pessimistic scenario: -15% revenue, compressed margins
        const pessimisticRevenue = oneYear.revenue * 0.85;
        const pessimisticProfit = oneYear.netIncome * 0.6;
        return {
            optimistic: {
                revenueChange: ((optimisticRevenue - oneYear.revenue) / oneYear.revenue) * 100,
                profitChange: ((optimisticProfit - oneYear.netIncome) / Math.max(1, oneYear.netIncome)) * 100
            },
            pessimistic: {
                revenueChange: ((pessimisticRevenue - oneYear.revenue) / oneYear.revenue) * 100,
                profitChange: ((pessimisticProfit - oneYear.netIncome) / Math.max(1, oneYear.netIncome)) * 100
            }
        };
    }
    // Calculate confidence score
    calculateConfidence(docs, baseline) {
        let confidence = 0.3; // Base confidence
        // Document quality
        if (docs.length >= 3)
            confidence += 0.2;
        if (docs.length >= 5)
            confidence += 0.1;
        // Data availability
        if (baseline.currentRevenue > 0)
            confidence += 0.2;
        if (baseline.historicalGrowthRate !== 5)
            confidence += 0.1; // Not default value
        if (baseline.currentExpenses > 0)
            confidence += 0.1;
        return Math.min(1, confidence);
    }
    // Generate basic projections when no financial documents available
    generateBasicProjections(applicationId) {
        const baselineData = {
            currentRevenue: 0,
            historicalGrowthRate: 5,
            currentMargins: 20,
            currentExpenses: 0,
            currentCashFlow: 0
        };
        const assumptions = {
            revenueGrowthRate: 5,
            grossMarginTrend: 'stable',
            expenseGrowthRate: 3,
            seasonalityFactor: 0.1,
            marketConditions: 'neutral',
            businessMaturity: 'growth',
            industryTrends: [],
            keyRisks: ['No financial statements available']
        };
        return {
            applicationId,
            baselineData,
            assumptions,
            oneYearProjection: {
                year: 1,
                revenue: 0,
                grossProfit: 0,
                operatingExpenses: 0,
                netIncome: 0,
                cashFlow: 0,
                accountsReceivable: 0,
                accountsPayable: 0,
                workingCapital: 0,
                capex: 0,
                debtServiceCoverage: 0
            },
            threeYearProjections: [],
            keyInsights: ['Financial projections cannot be generated without financial statements'],
            riskFactors: ['No financial documentation provided'],
            recommendations: ['Request financial statements before proceeding with lending decision'],
            scenarioAnalysis: {
                optimistic: { revenueChange: 0, profitChange: 0 },
                pessimistic: { revenueChange: 0, profitChange: 0 }
            },
            confidence: 0,
            generatedAt: new Date()
        };
    }
}
export const projectionGeneratorService = new ProjectionGeneratorService();
