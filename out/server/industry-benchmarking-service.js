/**
 * V2 Industry Benchmarking Service
 * Comprehensive industry-specific financial benchmarking and performance comparison
 */
import OpenAI from 'openai';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export class IndustryBenchmarkingService {
    industryCache = new Map();
    constructor() {
        console.log('🏢 Industry Benchmarking Service initialized');
    }
    /**
     * Main benchmarking method - compares applicant against industry standards
     */
    async benchmarkApplicant(applicant, industry) {
        const startTime = Date.now();
        console.log(`🔍 Benchmarking applicant against ${industry} industry standards`);
        try {
            // Get industry benchmark data
            const benchmark = await this.getIndustryBenchmark(industry);
            // Compare applicant metrics against industry standards
            const comparisonResults = this.compareMetrics(applicant, benchmark.benchmarks);
            // Calculate overall performance score
            const performanceScore = this.calculatePerformanceScore(comparisonResults);
            // Determine ranking
            const overallRanking = this.determineRanking(performanceScore);
            // Calculate risk adjustment
            const riskAdjustment = this.calculateRiskAdjustment(applicant, benchmark.riskProfile);
            // Generate analysis components
            const recommendations = this.generateRecommendations(applicant, benchmark, comparisonResults);
            const keyStrengths = this.identifyKeyStrengths(comparisonResults);
            const areasForImprovement = this.identifyAreasForImprovement(comparisonResults);
            const seasonalConsiderations = this.generateSeasonalConsiderations(benchmark.seasonality);
            const riskFactors = this.identifyRiskFactors(benchmark.riskProfile, applicant);
            const processingTime = Date.now() - startTime;
            console.log(`✅ Industry benchmarking completed in ${processingTime}ms`);
            return {
                applicantMetrics: applicant,
                industryBenchmark: benchmark,
                performanceScore,
                comparisonResults,
                overallRanking,
                recommendations,
                riskAdjustment,
                keyStrengths,
                areasForImprovement,
                seasonalConsiderations,
                riskFactors
            };
        }
        catch (error) {
            console.error('❌ Error in industry benchmarking:', error);
            throw new Error(`Industry benchmarking failed: ${error.message}`);
        }
    }
    /**
     * Get industry benchmark data from database or generate if not exists
     */
    async getIndustryBenchmark(industry) {
        const industryKey = industry.toLowerCase().trim();
        // Check cache first
        if (this.industryCache.has(industryKey)) {
            return this.industryCache.get(industryKey);
        }
        try {
            // Query database for existing industry data
            const result = await pool.query(`
        SELECT * FROM industry_benchmarks WHERE LOWER(industry) = $1
      `, [industryKey]);
            let benchmark;
            if (result.rows.length > 0) {
                const row = result.rows[0];
                benchmark = {
                    industry: row.industry,
                    benchmarks: {
                        averageMonthlyRevenue: row.average_monthly_revenue,
                        averageMonthlyExpenses: row.average_monthly_expenses,
                        healthyProfitMargin: row.healthy_profit_margin,
                        averageCashFlowRatio: row.average_cash_flow_ratio,
                        typicalDebtToRevenueRatio: row.typical_debt_to_revenue_ratio,
                        averageTransactionVolume: row.average_transaction_volume,
                        seasonalVariancePercent: row.seasonal_variance_percent,
                        growthRateExpected: row.growth_rate_expected
                    },
                    riskProfile: {
                        defaultRate: row.default_rate,
                        cyclicalSensitivity: row.cyclical_sensitivity,
                        regulatoryRisk: row.regulatory_risk,
                        marketVolatility: row.market_volatility,
                        competitiveIntensity: row.competitive_intensity,
                        capitalIntensity: row.capital_intensity
                    },
                    seasonality: {
                        hasSeasonality: row.has_seasonality,
                        peakMonths: row.peak_months || [],
                        lowMonths: row.low_months || [],
                        varianceCoefficient: row.variance_coefficient,
                        predictabilityScore: row.predictability_score
                    },
                    marketConditions: {
                        currentTrend: row.current_trend,
                        disruptionRisk: row.disruption_risk,
                        technologyImpact: row.technology_impact,
                        economicSensitivity: row.economic_sensitivity
                    }
                };
            }
            else {
                // Generate new industry benchmark using AI
                console.log(`🤖 Generating new industry benchmark for: ${industry}`);
                benchmark = await this.generateIndustryBenchmark(industry);
                await this.saveIndustryBenchmark(benchmark);
            }
            // Cache the result
            this.industryCache.set(industryKey, benchmark);
            return benchmark;
        }
        catch (error) {
            console.error('❌ Error getting industry benchmark:', error);
            throw error;
        }
    }
    /**
     * Compare applicant metrics against industry benchmarks
     */
    compareMetrics(applicant, benchmarks) {
        const comparisons = [];
        // Revenue comparison
        const revenueVariance = ((applicant.monthlyRevenue - benchmarks.averageMonthlyRevenue) / benchmarks.averageMonthlyRevenue) * 100;
        const revenuePercentile = this.calculatePercentile(applicant.monthlyRevenue, benchmarks.averageMonthlyRevenue, 0.3);
        comparisons.push({
            metric: 'Monthly Revenue',
            applicantValue: applicant.monthlyRevenue,
            industryAverage: benchmarks.averageMonthlyRevenue,
            percentile: revenuePercentile,
            variance: revenueVariance,
            status: this.getPerformanceStatus(revenuePercentile),
            impact: 'High'
        });
        // Expense comparison (lower is better)
        const expenseVariance = ((benchmarks.averageMonthlyExpenses - applicant.monthlyExpenses) / benchmarks.averageMonthlyExpenses) * 100;
        const expensePercentile = 100 - this.calculatePercentile(applicant.monthlyExpenses, benchmarks.averageMonthlyExpenses, 0.25);
        comparisons.push({
            metric: 'Monthly Expenses',
            applicantValue: applicant.monthlyExpenses,
            industryAverage: benchmarks.averageMonthlyExpenses,
            percentile: expensePercentile,
            variance: expenseVariance,
            status: this.getPerformanceStatus(expensePercentile),
            impact: 'Medium'
        });
        // Profit margin comparison
        const profitMarginVariance = ((applicant.profitMargin - benchmarks.healthyProfitMargin) / benchmarks.healthyProfitMargin) * 100;
        const profitMarginPercentile = this.calculatePercentile(applicant.profitMargin, benchmarks.healthyProfitMargin, 0.15);
        comparisons.push({
            metric: 'Profit Margin',
            applicantValue: applicant.profitMargin,
            industryAverage: benchmarks.healthyProfitMargin,
            percentile: profitMarginPercentile,
            variance: profitMarginVariance,
            status: this.getPerformanceStatus(profitMarginPercentile),
            impact: 'High'
        });
        // Cash flow ratio comparison
        const cashFlowVariance = ((applicant.cashFlowRatio - benchmarks.averageCashFlowRatio) / benchmarks.averageCashFlowRatio) * 100;
        const cashFlowPercentile = this.calculatePercentile(applicant.cashFlowRatio, benchmarks.averageCashFlowRatio, 0.08);
        comparisons.push({
            metric: 'Cash Flow Ratio',
            applicantValue: applicant.cashFlowRatio,
            industryAverage: benchmarks.averageCashFlowRatio,
            percentile: cashFlowPercentile,
            variance: cashFlowVariance,
            status: this.getPerformanceStatus(cashFlowPercentile),
            impact: 'Medium'
        });
        // Debt-to-revenue ratio comparison (lower is better)
        const debtRatioVariance = ((benchmarks.typicalDebtToRevenueRatio - applicant.debtToRevenueRatio) / benchmarks.typicalDebtToRevenueRatio) * 100;
        const debtRatioPercentile = 100 - this.calculatePercentile(applicant.debtToRevenueRatio, benchmarks.typicalDebtToRevenueRatio, 0.15);
        comparisons.push({
            metric: 'Debt-to-Revenue Ratio',
            applicantValue: applicant.debtToRevenueRatio,
            industryAverage: benchmarks.typicalDebtToRevenueRatio,
            percentile: debtRatioPercentile,
            variance: debtRatioVariance,
            status: this.getPerformanceStatus(debtRatioPercentile),
            impact: 'Medium'
        });
        return comparisons;
    }
    /**
     * Calculate performance percentile with standard deviation
     */
    calculatePercentile(value, average, stdDev) {
        const standardScore = (value - average) / (average * stdDev);
        // Convert to percentile using normal distribution approximation
        let percentile = 50 + (standardScore * 15);
        // Clamp between 1 and 99
        return Math.max(1, Math.min(99, percentile));
    }
    /**
     * Get performance status based on percentile
     */
    getPerformanceStatus(percentile) {
        if (percentile >= 80)
            return 'Excellent';
        if (percentile >= 60)
            return 'Good';
        if (percentile >= 40)
            return 'Average';
        if (percentile >= 20)
            return 'Below Average';
        return 'Poor';
    }
    /**
     * Calculate overall performance score weighted by impact
     */
    calculatePerformanceScore(comparisons) {
        let totalScore = 0;
        let totalWeight = 0;
        for (const comparison of comparisons) {
            const weight = this.getMetricWeight(comparison.impact);
            totalScore += comparison.percentile * weight;
            totalWeight += weight;
        }
        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
    }
    /**
     * Get metric weight based on impact level
     */
    getMetricWeight(impact) {
        switch (impact) {
            case 'High': return 3;
            case 'Medium': return 2;
            case 'Low': return 1;
            default: return 1;
        }
    }
    /**
     * Determine overall ranking based on performance score
     */
    determineRanking(performanceScore) {
        if (performanceScore >= 90)
            return 'Top 10%';
        if (performanceScore >= 75)
            return 'Top 25%';
        if (performanceScore >= 40)
            return 'Average';
        if (performanceScore >= 20)
            return 'Below Average';
        return 'Bottom 10%';
    }
    /**
     * Calculate risk adjustment based on industry and business factors
     */
    calculateRiskAdjustment(applicant, riskProfile) {
        let adjustment = 0;
        // Business age factor
        if (applicant.businessAge < 2)
            adjustment -= 5;
        else if (applicant.businessAge > 10)
            adjustment += 3;
        // Business size factor
        if (applicant.employeeCount < 5)
            adjustment -= 2;
        else if (applicant.employeeCount > 50)
            adjustment += 2;
        // Industry risk factors
        if (riskProfile.cyclicalSensitivity === 'High')
            adjustment -= 2;
        if (riskProfile.regulatoryRisk === 'High')
            adjustment -= 3;
        if (riskProfile.marketVolatility === 'High')
            adjustment -= 2;
        if (riskProfile.competitiveIntensity === 'High')
            adjustment -= 1;
        // Cap adjustment at +/- 15
        return Math.max(-15, Math.min(15, adjustment));
    }
    /**
     * Generate recommendations based on comparison results
     */
    generateRecommendations(applicant, benchmark, comparisons) {
        const recommendations = [];
        // Revenue recommendations
        const revenueComparison = comparisons.find(c => c.metric === 'Monthly Revenue');
        if (revenueComparison && revenueComparison.percentile < 50) {
            recommendations.push('Revenue is below industry average. Consider strategies to increase sales and market reach.');
        }
        // Profit margin recommendations
        const profitComparison = comparisons.find(c => c.metric === 'Profit Margin');
        if (profitComparison && profitComparison.percentile < 40) {
            recommendations.push('Profit margins need improvement. Focus on cost optimization and pricing strategies.');
        }
        // Cash flow recommendations
        const cashFlowComparison = comparisons.find(c => c.metric === 'Cash Flow Ratio');
        if (cashFlowComparison && cashFlowComparison.percentile < 30) {
            recommendations.push('Cash flow management requires attention. Implement better receivables collection and payment terms.');
        }
        // Debt ratio recommendations
        const debtComparison = comparisons.find(c => c.metric === 'Debt-to-Revenue Ratio');
        if (debtComparison && debtComparison.percentile < 40) {
            recommendations.push('Debt levels are high relative to revenue. Consider debt consolidation or revenue growth strategies.');
        }
        // Seasonality recommendations
        if (benchmark.seasonality.hasSeasonality) {
            recommendations.push('Industry shows seasonal patterns. Plan for cash flow fluctuations during peak and low months.');
        }
        // Industry-specific recommendations
        if (benchmark.riskProfile.technologyImpact === 'High') {
            recommendations.push('Technology disruption risk is high in this industry. Invest in digital transformation initiatives.');
        }
        if (benchmark.marketConditions.disruptionRisk === 'High') {
            recommendations.push('Market disruption risk is elevated. Diversify revenue streams and monitor competitive landscape closely.');
        }
        return recommendations;
    }
    /**
     * Identify key strengths from comparison results
     */
    identifyKeyStrengths(comparisons) {
        const strengths = [];
        for (const comparison of comparisons) {
            if (comparison.percentile >= 70) {
                strengths.push(`Strong ${comparison.metric.toLowerCase()} performance (${comparison.percentile.toFixed(0)}th percentile)`);
            }
        }
        return strengths;
    }
    /**
     * Identify areas for improvement from comparison results
     */
    identifyAreasForImprovement(comparisons) {
        const improvements = [];
        for (const comparison of comparisons) {
            if (comparison.percentile < 40) {
                improvements.push(`${comparison.metric} below industry standards (${comparison.percentile.toFixed(0)}th percentile)`);
            }
        }
        return improvements;
    }
    /**
     * Generate seasonal considerations
     */
    generateSeasonalConsiderations(seasonality) {
        const considerations = [];
        if (seasonality.hasSeasonality) {
            if (seasonality.peakMonths.length > 0) {
                const monthNames = seasonality.peakMonths.map(m => this.getMonthName(m)).join(', ');
                considerations.push(`Peak business months: ${monthNames}`);
            }
            if (seasonality.lowMonths.length > 0) {
                const monthNames = seasonality.lowMonths.map(m => this.getMonthName(m)).join(', ');
                considerations.push(`Low business months: ${monthNames}`);
            }
            if (seasonality.varianceCoefficient > 0.2) {
                considerations.push('High seasonal variance requires careful cash flow planning');
            }
        }
        return considerations;
    }
    /**
     * Identify risk factors
     */
    identifyRiskFactors(riskProfile, applicant) {
        const riskFactors = [];
        if (riskProfile.defaultRate > 0.08) {
            riskFactors.push(`Industry has elevated default rate (${(riskProfile.defaultRate * 100).toFixed(1)}%)`);
        }
        if (riskProfile.cyclicalSensitivity === 'High') {
            riskFactors.push('Industry is highly sensitive to economic cycles');
        }
        if (riskProfile.regulatoryRisk === 'High') {
            riskFactors.push('High regulatory risk in this industry');
        }
        if (riskProfile.marketVolatility === 'High') {
            riskFactors.push('Market volatility is high in this industry');
        }
        if (applicant.businessAge < 3) {
            riskFactors.push('Young business age increases lending risk');
        }
        if (applicant.debtToRevenueRatio > 0.6) {
            riskFactors.push('High debt-to-revenue ratio indicates elevated financial stress');
        }
        return riskFactors;
    }
    /**
     * Get month name from month number
     */
    getMonthName(month) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1] || 'Unknown';
    }
    /**
     * Generate new industry benchmark using AI
     */
    async generateIndustryBenchmark(industry) {
        console.log(`🤖 Generating AI-powered industry benchmark for: ${industry}`);
        const prompt = `Generate comprehensive industry benchmarks for the ${industry} industry.

Provide realistic JSON data based on current market conditions with:
1. Financial benchmarks (monthly revenue/expenses, margins, ratios)
2. Risk profile (default rates, sensitivity levels)  
3. Seasonality patterns (peak/low months, variance)
4. Market conditions (trends, disruption risks)

Use realistic values based on industry standards and current economic data.`;
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages: [
                    {
                        role: "system",
                        content: "You are an industry analysis expert. Provide realistic benchmarks based on current market data. Return valid JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.2
            });
            const generated = JSON.parse(response.choices[0].message.content || '{}');
            // Ensure we have a complete benchmark structure
            return {
                industry,
                benchmarks: generated.benchmarks || this.getDefaultBenchmarks(),
                riskProfile: generated.riskProfile || this.getDefaultRiskProfile(),
                seasonality: generated.seasonality || this.getDefaultSeasonality(),
                marketConditions: generated.marketConditions || this.getDefaultMarketConditions()
            };
        }
        catch (error) {
            console.error('❌ Error generating AI benchmark:', error);
            // Fallback to default values
            return {
                industry,
                benchmarks: this.getDefaultBenchmarks(),
                riskProfile: this.getDefaultRiskProfile(),
                seasonality: this.getDefaultSeasonality(),
                marketConditions: this.getDefaultMarketConditions()
            };
        }
    }
    /**
     * Save generated industry benchmark to database
     */
    async saveIndustryBenchmark(benchmark) {
        try {
            await pool.query(`
        INSERT INTO industry_benchmarks (
          industry, average_monthly_revenue, average_monthly_expenses, healthy_profit_margin,
          average_cash_flow_ratio, typical_debt_to_revenue_ratio, average_transaction_volume,
          seasonal_variance_percent, growth_rate_expected, default_rate, cyclical_sensitivity,
          regulatory_risk, market_volatility, competitive_intensity, capital_intensity,
          has_seasonality, peak_months, low_months, variance_coefficient, predictability_score,
          current_trend, disruption_risk, technology_impact, economic_sensitivity,
          data_source, sample_size, confidence_level
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) ON CONFLICT (industry) DO NOTHING
      `, [
                benchmark.industry,
                benchmark.benchmarks.averageMonthlyRevenue,
                benchmark.benchmarks.averageMonthlyExpenses,
                benchmark.benchmarks.healthyProfitMargin,
                benchmark.benchmarks.averageCashFlowRatio,
                benchmark.benchmarks.typicalDebtToRevenueRatio,
                benchmark.benchmarks.averageTransactionVolume,
                benchmark.benchmarks.seasonalVariancePercent,
                benchmark.benchmarks.growthRateExpected,
                benchmark.riskProfile.defaultRate,
                benchmark.riskProfile.cyclicalSensitivity,
                benchmark.riskProfile.regulatoryRisk,
                benchmark.riskProfile.marketVolatility,
                benchmark.riskProfile.competitiveIntensity,
                benchmark.riskProfile.capitalIntensity,
                benchmark.seasonality.hasSeasonality,
                benchmark.seasonality.peakMonths,
                benchmark.seasonality.lowMonths,
                benchmark.seasonality.varianceCoefficient,
                benchmark.seasonality.predictabilityScore,
                benchmark.marketConditions.currentTrend,
                benchmark.marketConditions.disruptionRisk,
                benchmark.marketConditions.technologyImpact,
                benchmark.marketConditions.economicSensitivity,
                'AI Generated V2',
                500,
                0.75
            ]);
            console.log(`✅ Saved AI-generated benchmark for ${benchmark.industry} industry`);
        }
        catch (error) {
            console.error('❌ Error saving industry benchmark:', error);
        }
    }
    /**
     * Get statistics about industry benchmarking
     */
    async getStats() {
        try {
            const [industryCount, comparisonCount, recentComparisons] = await Promise.all([
                pool.query('SELECT COUNT(*) as count FROM industry_benchmarks'),
                pool.query('SELECT COUNT(*) as count FROM benchmark_comparisons'),
                pool.query(`
          SELECT COUNT(*) as count 
          FROM benchmark_comparisons 
          WHERE createdAt > NOW() - INTERVAL '30 days'
        `)
            ]);
            return {
                totalIndustries: parseInt(industryCount.rows[0].count),
                totalComparisons: parseInt(comparisonCount.rows[0].count),
                recentComparisons: parseInt(recentComparisons.rows[0].count),
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('❌ Error getting benchmarking stats:', error);
            throw error;
        }
    }
    /**
     * Get available industries
     */
    async getAvailableIndustries() {
        try {
            const result = await pool.query('SELECT industry FROM industry_benchmarks ORDER BY industry');
            return result.rows.map(row => row.industry);
        }
        catch (error) {
            console.error('❌ Error getting available industries:', error);
            throw error;
        }
    }
    // Default fallback methods
    getDefaultBenchmarks() {
        return {
            averageMonthlyRevenue: 100000,
            averageMonthlyExpenses: 80000,
            healthyProfitMargin: 0.20,
            averageCashFlowRatio: 0.15,
            typicalDebtToRevenueRatio: 0.50,
            averageTransactionVolume: 200,
            seasonalVariancePercent: 0.15,
            growthRateExpected: 0.08
        };
    }
    getDefaultRiskProfile() {
        return {
            defaultRate: 0.06,
            cyclicalSensitivity: 'Medium',
            regulatoryRisk: 'Medium',
            marketVolatility: 'Medium',
            competitiveIntensity: 'Medium',
            capitalIntensity: 'Medium'
        };
    }
    getDefaultSeasonality() {
        return {
            hasSeasonality: false,
            peakMonths: [],
            lowMonths: [],
            varianceCoefficient: 0.10,
            predictabilityScore: 70
        };
    }
    getDefaultMarketConditions() {
        return {
            currentTrend: 'Stable',
            disruptionRisk: 'Medium',
            technologyImpact: 'Medium',
            economicSensitivity: 'Medium'
        };
    }
}
