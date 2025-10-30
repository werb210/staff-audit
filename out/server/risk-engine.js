import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { db } from "./db";
import { riskAssessments } from "../shared/schema";
import { eq } from "drizzle-orm";
// Industry risk benchmarks
const industryBenchmarks = {
    'retail': { avgRiskScore: 65, defaultRate: 0.08, maxLoanRatio: 0.3 },
    'manufacturing': { avgRiskScore: 55, defaultRate: 0.06, maxLoanRatio: 0.4 },
    'technology': { avgRiskScore: 45, defaultRate: 0.04, maxLoanRatio: 0.5 },
    'healthcare': { avgRiskScore: 50, defaultRate: 0.05, maxLoanRatio: 0.4 },
    'hospitality': { avgRiskScore: 75, defaultRate: 0.12, maxLoanRatio: 0.25 },
    'construction': { avgRiskScore: 70, defaultRate: 0.10, maxLoanRatio: 0.3 },
    'services': { avgRiskScore: 60, defaultRate: 0.07, maxLoanRatio: 0.35 },
    'agriculture': { avgRiskScore: 68, defaultRate: 0.09, maxLoanRatio: 0.32 },
    'transportation': { avgRiskScore: 62, defaultRate: 0.08, maxLoanRatio: 0.35 },
    'finance': { avgRiskScore: 48, defaultRate: 0.05, maxLoanRatio: 0.45 },
    'education': { avgRiskScore: 52, defaultRate: 0.06, maxLoanRatio: 0.4 },
    'real_estate': { avgRiskScore: 58, defaultRate: 0.07, maxLoanRatio: 0.38 }
};
export class RiskAssessmentEngine {
    openai;
    anthropic;
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }
    async calculateRiskScore(input) {
        const startTime = Date.now();
        // Calculate core financial ratios
        const debtToIncomeRatio = this.calculateDebtToIncomeRatio(input);
        const cashFlowAnalysis = this.analyzeCashFlow(input);
        const complianceFlags = await this.checkCompliance(input);
        const industryData = this.getIndustryBenchmarks(input.industry);
        // Multi-factor risk scoring algorithm
        let riskScore = 50; // Base score
        // Debt-to-income adjustments
        if (debtToIncomeRatio > 80)
            riskScore += 30;
        else if (debtToIncomeRatio > 60)
            riskScore += 20;
        else if (debtToIncomeRatio > 40)
            riskScore += 10;
        else if (debtToIncomeRatio < 20)
            riskScore -= 10;
        // Cash flow adjustments
        const cashFlowRatio = cashFlowAnalysis.cashFlowRatio;
        if (cashFlowRatio < 0)
            riskScore += 25;
        else if (cashFlowRatio < 0.1)
            riskScore += 15;
        else if (cashFlowRatio > 0.3)
            riskScore -= 15;
        // Industry risk adjustments
        if (industryData) {
            riskScore += (industryData.avgRiskScore - 50) * 0.3;
        }
        // Credit score adjustments (if available)
        if (input.creditScore) {
            if (input.creditScore < 550)
                riskScore += 20;
            else if (input.creditScore < 650)
                riskScore += 10;
            else if (input.creditScore > 750)
                riskScore -= 15;
        }
        // Business age factor
        if (input.businessAge && input.businessAge < 2)
            riskScore += 15;
        else if (input.businessAge && input.businessAge > 10)
            riskScore -= 10;
        // Loan amount vs revenue ratio
        const loanToRevenueRatio = input.loanAmount / input.revenue;
        if (loanToRevenueRatio > 0.5)
            riskScore += 20;
        else if (loanToRevenueRatio > 0.3)
            riskScore += 10;
        else if (loanToRevenueRatio < 0.1)
            riskScore -= 5;
        // Ensure score is within bounds
        riskScore = Math.max(0, Math.min(100, riskScore));
        const riskLevel = this.determineRiskLevel(riskScore);
        const defaultProbability = this.calculateDefaultProbability(riskScore, industryData);
        const confidenceLevel = this.calculateConfidenceLevel(input);
        const keyRiskFactors = this.identifyKeyRiskFactors(input, riskScore, debtToIncomeRatio, cashFlowAnalysis);
        // Enable stress testing with the simplified non-recursive implementation
        const stressTestResults = await this.runStressTests(input, riskScore);
        const recommendations = [
            "Monitor cash flow regularly to ensure adequate liquidity",
            "Consider establishing credit line for emergency funding",
            "Implement financial controls and budgeting processes",
            "Review and optimize operational expenses"
        ];
        const processingTime = Date.now() - startTime;
        return {
            riskScore,
            riskLevel,
            debtToIncomeRatio,
            cashFlowAnalysis,
            recommendations,
            complianceFlags,
            industryBenchmarks: {
                industryAvgRiskScore: industryData?.avgRiskScore || 60,
                industryDefaultRate: industryData?.defaultRate || 0.08,
                relativeRiskPosition: this.getRelativeRiskPosition(riskScore, industryData?.avgRiskScore || 60),
                industryMaxLoanRatio: industryData?.maxLoanRatio || 0.3
            },
            defaultProbability,
            confidenceLevel,
            keyRiskFactors,
            stressTestResults
        };
    }
    calculateDebtToIncomeRatio(input) {
        const totalDebt = input.liabilities;
        const monthlyIncome = input.netIncome / 12;
        const monthlyDebtService = (input.loanAmount * (input.interestRate / 12)) / (1 - Math.pow(1 + (input.interestRate / 12), -input.loanTerm));
        return monthlyIncome > 0 ? ((monthlyDebtService / monthlyIncome) * 100) : 100;
    }
    analyzeCashFlow(input) {
        const monthlyRevenue = input.revenue / 12;
        const monthlyExpenses = input.expenses / 12;
        const monthlyNetCashFlow = monthlyRevenue - monthlyExpenses;
        const cashFlowRatio = monthlyRevenue > 0 ? (monthlyNetCashFlow / monthlyRevenue) : 0;
        // Calculate liquidity ratio (current assets / current liabilities)
        const liquidityRatio = input.liabilities > 0 ? (input.assets / input.liabilities) : 2;
        // Debt Service Coverage Ratio
        const monthlyDebtService = (input.loanAmount * (input.interestRate / 12)) / (1 - Math.pow(1 + (input.interestRate / 12), -input.loanTerm));
        const debtServiceCoverage = monthlyDebtService > 0 ? (monthlyNetCashFlow / monthlyDebtService) : 5;
        return {
            monthlyNetCashFlow,
            cashFlowRatio,
            liquidityRatio,
            debtServiceCoverage
        };
    }
    async checkCompliance(input) {
        const flags = [];
        // Basic compliance checks
        if (input.loanAmount > input.revenue * 0.5) {
            flags.push("Loan amount exceeds 50% of annual revenue");
        }
        if (input.businessAge && input.businessAge < 1) {
            flags.push("Business less than 1 year old - higher regulatory scrutiny");
        }
        const debtToIncomeRatio = this.calculateDebtToIncomeRatio(input);
        if (debtToIncomeRatio > 75) {
            flags.push("Debt-to-income ratio exceeds regulatory guidelines");
        }
        return flags;
    }
    getIndustryBenchmarks(industry) {
        // Normalize industry name
        const normalizedIndustry = industry.toLowerCase().replace(/[^a-z]/g, '_');
        return industryBenchmarks[normalizedIndustry] || industryBenchmarks.services;
    }
    determineRiskLevel(riskScore) {
        if (riskScore <= 30)
            return 'Low';
        if (riskScore <= 60)
            return 'Medium';
        if (riskScore <= 80)
            return 'High';
        return 'Critical';
    }
    calculateDefaultProbability(riskScore, industryData) {
        const baseDefaultRate = industryData?.defaultRate || 0.08;
        const riskMultiplier = (riskScore / 50); // 50 is average risk
        return Math.min(0.99, baseDefaultRate * riskMultiplier);
    }
    calculateConfidenceLevel(input) {
        let confidence = 70; // Base confidence
        // More data points increase confidence
        if (input.creditScore)
            confidence += 10;
        if (input.businessAge)
            confidence += 5;
        if (input.employeeCount)
            confidence += 5;
        if (input.assets > 0)
            confidence += 5;
        if (input.revenue > 0)
            confidence += 5;
        return Math.min(95, confidence);
    }
    identifyKeyRiskFactors(input, riskScore, debtToIncomeRatio, cashFlowAnalysis) {
        const factors = [];
        if (debtToIncomeRatio > 60) {
            factors.push("High debt-to-income ratio");
        }
        if (cashFlowAnalysis.cashFlowRatio < 0.1) {
            factors.push("Low cash flow margin");
        }
        if (cashFlowAnalysis.liquidityRatio < 1.2) {
            factors.push("Poor liquidity position");
        }
        if (input.businessAge && input.businessAge < 3) {
            factors.push("Limited business operating history");
        }
        if (input.creditScore && input.creditScore < 650) {
            factors.push("Below-average credit score");
        }
        const loanToRevenueRatio = input.loanAmount / input.revenue;
        if (loanToRevenueRatio > 0.4) {
            factors.push("High loan amount relative to revenue");
        }
        return factors;
    }
    async runStressTests(input, baseRiskScore) {
        // Simplified stress tests without recursive calculateRiskScore calls
        const results = [];
        // Simple mathematical estimates based on revenue/cost changes
        const revenueStressImpact = 15; // +15 risk points for 25% revenue drop
        const rateStressImpact = 10; // +10 risk points for 3% rate increase
        const industryStressImpact = 8; // +8 risk points for industry disruption
        results.push({
            scenario: "Economic Downturn (25% revenue drop)",
            impact: "Revenue stress test",
            newRiskScore: Math.min(100, baseRiskScore + revenueStressImpact),
            probability: 0.15
        });
        results.push({
            scenario: "Interest Rate Increase (+3%)",
            impact: "Cost of capital stress",
            newRiskScore: Math.min(100, baseRiskScore + rateStressImpact),
            probability: 0.25
        });
        results.push({
            scenario: "Industry Disruption (15% revenue impact)",
            impact: "Sector-specific stress",
            newRiskScore: Math.min(100, baseRiskScore + industryStressImpact),
            probability: 0.20
        });
        return results;
    }
    async generateAIRecommendations(input, riskScore, keyRiskFactors) {
        try {
            const prompt = `
Analyze this business loan application and provide specific risk mitigation recommendations:

Business Profile:
- Industry: ${input.industry}
- Annual Revenue: $${input.revenue.toLocaleString()}
- Loan Amount: $${input.loanAmount.toLocaleString()}
- Business Age: ${input.businessAge || 'Unknown'} years
- Risk Score: ${riskScore}/100

Key Risk Factors:
${keyRiskFactors.map(factor => `- ${factor}`).join('\n')}

Provide 3-5 specific, actionable recommendations to mitigate these risks. Focus on:
1. Financial management improvements
2. Loan structure modifications
3. Risk monitoring measures
4. Business operational improvements

Format as a JSON array of strings.
`;
            // Use OpenAI GPT-4 for recommendations
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages: [
                    {
                        role: "system",
                        content: "You are a senior financial risk analyst providing loan risk mitigation recommendations. Respond with a JSON array of practical recommendations."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 1000
            });
            const result = JSON.parse(response.choices[0].message.content || '{"recommendations": []}');
            return result.recommendations || [
                "Monitor monthly cash flow and maintain 3-month operating expense reserve",
                "Consider reducing loan amount or extending term to improve debt service coverage",
                "Implement regular financial reporting and risk monitoring processes"
            ];
        }
        catch (error) {
            console.error('AI recommendation generation failed:', error);
            // Fallback recommendations based on risk factors
            const fallbackRecommendations = [];
            if (keyRiskFactors.includes("High debt-to-income ratio")) {
                fallbackRecommendations.push("Reduce existing debt or increase revenue before loan approval");
            }
            if (keyRiskFactors.includes("Low cash flow margin")) {
                fallbackRecommendations.push("Improve operational efficiency to increase cash flow margins");
            }
            if (keyRiskFactors.includes("Limited business operating history")) {
                fallbackRecommendations.push("Provide additional collateral or personal guarantees");
            }
            return fallbackRecommendations.length > 0 ? fallbackRecommendations : [
                "Monitor financial performance monthly",
                "Maintain adequate cash reserves",
                "Consider loan structure modifications"
            ];
        }
    }
    getRelativeRiskPosition(riskScore, industryAvg) {
        const difference = riskScore - industryAvg;
        if (difference > 15)
            return "Significantly above industry average";
        if (difference > 5)
            return "Above industry average";
        if (difference < -15)
            return "Significantly below industry average";
        if (difference < -5)
            return "Below industry average";
        return "Near industry average";
    }
    // Save risk assessment to database
    async saveRiskAssessment(applicationId, result, input, aiProvider = "openai", modelVersion = "gpt-4o", processingTime = 0) {
        try {
            const [savedAssessment] = await db
                .insert(riskAssessments)
                .values({
                applicationId,
                riskScore: Math.round(result.riskScore),
                riskLevel: result.riskLevel,
                debtToIncomeRatio: result.debtToIncomeRatio.toString(),
                cashFlowScore: result.cashFlowAnalysis.cashFlowRatio.toString(),
                industryRiskFactor: result.industryBenchmarks.industryAvgRiskScore.toString(),
                creditScore: input.creditScore ? Math.round(input.creditScore) : null,
                defaultProbability: result.defaultProbability.toString(),
                confidenceLevel: result.confidenceLevel.toString(),
                complianceFlags: result.complianceFlags,
                recommendations: result.recommendations,
                keyRiskFactors: result.keyRiskFactors,
                stressTestResults: result.stressTestResults,
                industryBenchmarks: result.industryBenchmarks,
                analysisData: {
                    cashFlowAnalysis: result.cashFlowAnalysis,
                    processingMetadata: {
                        timestamp: new Date().toISOString(),
                        processingTimeMs: processingTime
                    }
                },
                aiProvider,
                modelVersion,
                processingTimeMs: Math.round(processingTime)
            })
                .returning();
            return savedAssessment;
        }
        catch (error) {
            console.error('Failed to save risk assessment:', error);
            throw error;
        }
    }
    // Get existing risk assessment
    async getRiskAssessment(applicationId) {
        try {
            const [assessment] = await db
                .select()
                .from(riskAssessments)
                .where(eq(riskAssessments.applicationId, applicationId))
                .orderBy(riskAssessments.createdAt)
                .limit(1);
            return assessment || null;
        }
        catch (error) {
            console.error('Failed to get risk assessment:', error);
            throw error;
        }
    }
}
export default RiskAssessmentEngine;
