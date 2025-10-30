/**
 * V2 Industry Benchmarking API Routes
 * Comprehensive industry-specific financial benchmarking endpoints
 */
import { Router } from 'express';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { IndustryBenchmarkingService } from '../industry-benchmarking-service';
neonConfig.webSocketConstructor = ws;
// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// Initialize benchmarking service
const benchmarkingService = new IndustryBenchmarkingService();
const router = Router();
// Simple auth middleware (matching pattern from other V2 modules)
function simpleAuth(req, res, next) {
    // In development, allow all requests
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    // For production, you can add proper JWT validation here
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'Authorization required' });
    }
    next();
}
/**
 * POST /api/benchmarking/analyze/:applicationId
 * Run comprehensive industry benchmarking analysis for an application
 */
router.post('/analyze/:applicationId', simpleAuth, async (req, res) => {
    const startTime = Date.now();
    try {
        const applicationId = req.params.applicationId;
        console.log(`🔍 Starting industry benchmarking analysis for application: ${applicationId}`);
        // Get application data from database
        const applicationResult = await pool.query(`
      SELECT 
        id, industry, annual_revenue, annual_expenses, existing_debt,
        years_in_business, employee_count
      FROM business_loan_applications 
      WHERE id = $1
    `, [applicationId]);
        if (applicationResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }
        const application = applicationResult.rows[0];
        // Get enhanced metrics from banking analysis if available
        const bankingResult = await pool.query(`
      SELECT profit_margin, cash_flow_ratio, transaction_count
      FROM bank_statement_analysis 
      WHERE applicationId = $1
      ORDER BY createdAt DESC 
      LIMIT 1
    `, [applicationId]);
        const bankingData = bankingResult.rows[0];
        // Build applicant metrics
        const applicantMetrics = {
            monthlyRevenue: (application.annual_revenue || 0) / 12,
            monthlyExpenses: (application.annual_expenses || (application.annual_revenue * 0.8)) / 12,
            profitMargin: bankingData?.profit_margin ||
                ((application.annual_revenue - (application.annual_expenses || 0)) / application.annual_revenue),
            cashFlowRatio: bankingData?.cash_flow_ratio || 0.12,
            debtToRevenueRatio: (application.existing_debt || 0) / (application.annual_revenue || 1),
            transactionVolume: bankingData?.transaction_count || 150,
            businessAge: application.years_in_business || 1,
            employeeCount: application.employee_count || 5
        };
        // Run benchmarking analysis
        const benchmarkResult = await benchmarkingService.benchmarkApplicant(applicantMetrics, application.industry || 'general');
        // Save benchmark comparison to database
        await pool.query(`
      INSERT INTO benchmark_comparisons (
        applicationId, industry, applicant_monthly_revenue, applicant_monthly_expenses,
        applicant_profit_margin, applicant_cash_flow_ratio, applicant_debt_to_revenue_ratio,
        applicant_transaction_volume, applicant_business_age, applicant_employee_count,
        performance_score, overall_ranking, risk_adjustment,
        revenue_percentile, expense_percentile, profit_margin_percentile,
        cash_flow_percentile, debt_ratio_percentile,
        revenue_status, expense_status, profit_margin_status,
        cash_flow_status, debt_ratio_status,
        revenue_impact, expense_impact, profit_margin_impact,
        cash_flow_impact, debt_ratio_impact,
        key_strengths, areas_for_improvement, recommendations,
        seasonal_considerations, risk_factors,
        analysis_version, confidence_level, processing_time
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
      ) ON CONFLICT (applicationId) DO UPDATE SET
        performance_score = EXCLUDED.performance_score,
        overall_ranking = EXCLUDED.overall_ranking,
        risk_adjustment = EXCLUDED.risk_adjustment,
        recommendations = EXCLUDED.recommendations,
        processing_time = EXCLUDED.processing_time,
        updatedAt = NOW()
    `, [
            applicationId, benchmarkResult.industryBenchmark.industry,
            applicantMetrics.monthlyRevenue, applicantMetrics.monthlyExpenses,
            applicantMetrics.profitMargin, applicantMetrics.cashFlowRatio,
            applicantMetrics.debtToRevenueRatio, applicantMetrics.transactionVolume,
            applicantMetrics.businessAge, applicantMetrics.employeeCount,
            benchmarkResult.performanceScore, benchmarkResult.overallRanking,
            benchmarkResult.riskAdjustment,
            // Extract percentiles from comparison results
            benchmarkResult.comparisonResults.find(c => c.metric === 'Monthly Revenue')?.percentile || 50,
            benchmarkResult.comparisonResults.find(c => c.metric === 'Monthly Expenses')?.percentile || 50,
            benchmarkResult.comparisonResults.find(c => c.metric === 'Profit Margin')?.percentile || 50,
            benchmarkResult.comparisonResults.find(c => c.metric === 'Cash Flow Ratio')?.percentile || 50,
            benchmarkResult.comparisonResults.find(c => c.metric === 'Debt-to-Revenue Ratio')?.percentile || 50,
            // Extract statuses
            benchmarkResult.comparisonResults.find(c => c.metric === 'Monthly Revenue')?.status || 'Average',
            benchmarkResult.comparisonResults.find(c => c.metric === 'Monthly Expenses')?.status || 'Average',
            benchmarkResult.comparisonResults.find(c => c.metric === 'Profit Margin')?.status || 'Average',
            benchmarkResult.comparisonResults.find(c => c.metric === 'Cash Flow Ratio')?.status || 'Average',
            benchmarkResult.comparisonResults.find(c => c.metric === 'Debt-to-Revenue Ratio')?.status || 'Average',
            // Extract impacts
            benchmarkResult.comparisonResults.find(c => c.metric === 'Monthly Revenue')?.impact || 'Medium',
            benchmarkResult.comparisonResults.find(c => c.metric === 'Monthly Expenses')?.impact || 'Medium',
            benchmarkResult.comparisonResults.find(c => c.metric === 'Profit Margin')?.impact || 'Medium',
            benchmarkResult.comparisonResults.find(c => c.metric === 'Cash Flow Ratio')?.impact || 'Medium',
            benchmarkResult.comparisonResults.find(c => c.metric === 'Debt-to-Revenue Ratio')?.impact || 'Medium',
            // Arrays
            benchmarkResult.keyStrengths,
            benchmarkResult.areasForImprovement,
            benchmarkResult.recommendations,
            benchmarkResult.seasonalConsiderations,
            benchmarkResult.riskFactors,
            '2.0',
            0.85,
            Date.now() - startTime
        ]);
        const processingTime = Date.now() - startTime;
        console.log(`✅ Industry benchmarking completed in ${processingTime}ms`);
        res.json({
            success: true,
            data: benchmarkResult,
            meta: {
                processingTime,
                analysisVersion: '2.0',
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Industry benchmarking error:', error);
        res.status(500).json({
            success: false,
            error: 'Industry benchmarking analysis failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * GET /api/benchmarking/results/:applicationId
 * Get stored benchmark comparison results for an application
 */
router.get('/results/:applicationId', simpleAuth, async (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        const result = await pool.query(`
      SELECT * FROM benchmark_comparisons 
      WHERE applicationId = $1
      ORDER BY createdAt DESC 
      LIMIT 1
    `, [applicationId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No benchmark analysis found for this application',
                suggestion: 'Run benchmark analysis first'
            });
        }
        const comparison = result.rows[0];
        // Format the response to match the service interface
        const formattedResult = {
            applicantMetrics: {
                monthlyRevenue: comparison.applicant_monthly_revenue,
                monthlyExpenses: comparison.applicant_monthly_expenses,
                profitMargin: comparison.applicant_profit_margin,
                cashFlowRatio: comparison.applicant_cash_flow_ratio,
                debtToRevenueRatio: comparison.applicant_debt_to_revenue_ratio,
                transactionVolume: comparison.applicant_transaction_volume,
                businessAge: comparison.applicant_business_age,
                employeeCount: comparison.applicant_employee_count
            },
            performanceScore: comparison.performance_score,
            overallRanking: comparison.overall_ranking,
            riskAdjustment: comparison.risk_adjustment,
            comparisonResults: [
                {
                    metric: 'Monthly Revenue',
                    percentile: comparison.revenue_percentile,
                    status: comparison.revenue_status,
                    impact: comparison.revenue_impact
                },
                {
                    metric: 'Monthly Expenses',
                    percentile: comparison.expense_percentile,
                    status: comparison.expense_status,
                    impact: comparison.expense_impact
                },
                {
                    metric: 'Profit Margin',
                    percentile: comparison.profit_margin_percentile,
                    status: comparison.profit_margin_status,
                    impact: comparison.profit_margin_impact
                },
                {
                    metric: 'Cash Flow Ratio',
                    percentile: comparison.cash_flow_percentile,
                    status: comparison.cash_flow_status,
                    impact: comparison.cash_flow_impact
                },
                {
                    metric: 'Debt-to-Revenue Ratio',
                    percentile: comparison.debt_ratio_percentile,
                    status: comparison.debt_ratio_status,
                    impact: comparison.debt_ratio_impact
                }
            ],
            recommendations: comparison.recommendations || [],
            keyStrengths: comparison.key_strengths || [],
            areasForImprovement: comparison.areas_for_improvement || [],
            seasonalConsiderations: comparison.seasonal_considerations || [],
            riskFactors: comparison.risk_factors || [],
            industry: comparison.industry,
            analysisDate: comparison.createdAt,
            processingTime: comparison.processing_time
        };
        res.json({
            success: true,
            data: formattedResult,
            meta: {
                analysisVersion: comparison.analysis_version,
                confidenceLevel: comparison.confidence_level,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Error retrieving benchmark results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve benchmark results'
        });
    }
});
/**
 * GET /api/benchmarking/industry/:industry
 * Get industry benchmark data for a specific industry
 */
router.get('/industry/:industry', simpleAuth, async (req, res) => {
    try {
        const industry = req.params.industry.toLowerCase();
        const result = await pool.query(`
      SELECT * FROM industry_benchmarks 
      WHERE LOWER(industry) = $1
    `, [industry]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Industry benchmark data not found',
                availableIndustries: await benchmarkingService.getAvailableIndustries()
            });
        }
        const benchmark = result.rows[0];
        res.json({
            success: true,
            data: {
                industry: benchmark.industry,
                benchmarks: {
                    averageMonthlyRevenue: benchmark.average_monthly_revenue,
                    averageMonthlyExpenses: benchmark.average_monthly_expenses,
                    healthyProfitMargin: benchmark.healthy_profit_margin,
                    averageCashFlowRatio: benchmark.average_cash_flow_ratio,
                    typicalDebtToRevenueRatio: benchmark.typical_debt_to_revenue_ratio,
                    averageTransactionVolume: benchmark.average_transaction_volume,
                    seasonalVariancePercent: benchmark.seasonal_variance_percent,
                    growthRateExpected: benchmark.growth_rate_expected
                },
                riskProfile: {
                    defaultRate: benchmark.default_rate,
                    cyclicalSensitivity: benchmark.cyclical_sensitivity,
                    regulatoryRisk: benchmark.regulatory_risk,
                    marketVolatility: benchmark.market_volatility,
                    competitiveIntensity: benchmark.competitive_intensity,
                    capitalIntensity: benchmark.capital_intensity
                },
                seasonality: {
                    hasSeasonality: benchmark.has_seasonality,
                    peakMonths: benchmark.peak_months || [],
                    lowMonths: benchmark.low_months || [],
                    varianceCoefficient: benchmark.variance_coefficient,
                    predictabilityScore: benchmark.predictability_score
                },
                marketConditions: {
                    currentTrend: benchmark.current_trend,
                    disruptionRisk: benchmark.disruption_risk,
                    technologyImpact: benchmark.technology_impact,
                    economicSensitivity: benchmark.economic_sensitivity
                },
                metadata: {
                    dataSource: benchmark.data_source,
                    lastUpdated: benchmark.last_updated,
                    sampleSize: benchmark.sample_size,
                    confidenceLevel: benchmark.confidence_level
                }
            }
        });
    }
    catch (error) {
        console.error('❌ Error getting industry benchmark:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve industry benchmark'
        });
    }
});
/**
 * GET /api/benchmarking/industries
 * Get list of available industries with benchmark data
 */
router.get('/industries', simpleAuth, async (req, res) => {
    try {
        const industries = await benchmarkingService.getAvailableIndustries();
        res.json({
            success: true,
            data: industries,
            meta: {
                count: industries.length,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Error getting available industries:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve available industries'
        });
    }
});
/**
 * GET /api/benchmarking/stats
 * Get comprehensive benchmarking statistics
 */
router.get('/stats', simpleAuth, async (req, res) => {
    try {
        const stats = await benchmarkingService.getStats();
        // Get additional analytics
        const [performanceDistribution, industryPerformance, recentActivity] = await Promise.all([
            // Performance score distribution
            pool.query(`
        SELECT 
          CASE 
            WHEN performance_score >= 90 THEN 'Top 10%'
            WHEN performance_score >= 75 THEN 'Top 25%'
            WHEN performance_score >= 40 THEN 'Average'
            WHEN performance_score >= 20 THEN 'Below Average'
            ELSE 'Bottom 10%'
          END as ranking,
          COUNT(*) as count
        FROM benchmark_comparisons
        GROUP BY ranking
        ORDER BY 
          CASE ranking
            WHEN 'Top 10%' THEN 1
            WHEN 'Top 25%' THEN 2
            WHEN 'Average' THEN 3
            WHEN 'Below Average' THEN 4
            WHEN 'Bottom 10%' THEN 5
          END
      `),
            // Average performance by industry
            pool.query(`
        SELECT 
          industry,
          COUNT(*) as applications,
          AVG(performance_score) as avg_performance,
          AVG(risk_adjustment) as avg_risk_adjustment
        FROM benchmark_comparisons
        GROUP BY industry
        ORDER BY avg_performance DESC
      `),
            // Recent analysis activity (last 7 days)
            pool.query(`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as analyses
        FROM benchmark_comparisons
        WHERE createdAt > NOW() - INTERVAL '7 days'
        GROUP BY DATE(createdAt)
        ORDER BY date DESC
      `)
        ]);
        res.json({
            success: true,
            data: {
                ...stats,
                performanceDistribution: performanceDistribution.rows,
                industryPerformance: industryPerformance.rows,
                recentActivity: recentActivity.rows
            },
            meta: {
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Error getting benchmarking stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve benchmarking statistics'
        });
    }
});
/**
 * POST /api/benchmarking/bulk-analyze
 * Analyze multiple applications in bulk
 */
router.post('/bulk-analyze', simpleAuth, async (req, res) => {
    try {
        const { applicationIds } = req.body;
        if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'applicationIds array is required'
            });
        }
        if (applicationIds.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 50 applications can be analyzed in bulk'
            });
        }
        const results = [];
        const errors = [];
        for (const applicationId of applicationIds) {
            try {
                // For bulk analysis, we'll make internal API calls
                const response = await fetch(`http://localhost:5000/api/benchmarking/analyze/${applicationId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.authorization || ''
                    }
                });
                if (response.ok) {
                    const result = await response.json();
                    results.push({
                        applicationId,
                        success: true,
                        performanceScore: result.data.performanceScore,
                        ranking: result.data.overallRanking
                    });
                }
                else {
                    errors.push({
                        applicationId,
                        error: 'Analysis failed'
                    });
                }
            }
            catch (error) {
                errors.push({
                    applicationId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        res.json({
            success: true,
            data: {
                analyzed: results.length,
                failed: errors.length,
                results,
                errors
            },
            meta: {
                totalRequested: applicationIds.length,
                successRate: (results.length / applicationIds.length) * 100,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Error in bulk analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Bulk analysis failed'
        });
    }
});
/**
 * POST /api/benchmarking/generate-report/:applicationId
 * Generate comprehensive benchmark comparison report
 */
router.post('/generate-report/:applicationId', simpleAuth, async (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        // Get benchmark results
        const resultsResponse = await fetch(`http://localhost:5000/api/benchmarking/results/${applicationId}`, {
            headers: {
                'Authorization': req.headers.authorization || ''
            }
        });
        if (!resultsResponse.ok) {
            return res.status(404).json({
                success: false,
                error: 'No benchmark analysis found. Run analysis first.'
            });
        }
        const benchmarkData = await resultsResponse.json();
        const comparison = benchmarkData.data;
        // Generate comprehensive report
        const report = {
            applicationId,
            executiveSummary: {
                performanceScore: comparison.performanceScore,
                ranking: comparison.overallRanking,
                industry: comparison.industry,
                riskAdjustment: comparison.riskAdjustment,
                analysisDate: comparison.analysisDate
            },
            keyFindings: {
                strengths: comparison.keyStrengths,
                improvements: comparison.areasForImprovement,
                riskFactors: comparison.riskFactors
            },
            detailedAnalysis: {
                metrics: comparison.comparisonResults.map(metric => ({
                    name: metric.metric,
                    score: `${metric.percentile}th percentile`,
                    status: metric.status,
                    impact: metric.impact
                })),
                seasonalFactors: comparison.seasonalConsiderations,
                recommendations: comparison.recommendations
            },
            industryContext: {
                industryName: comparison.industry,
                marketPosition: comparison.overallRanking,
                competitiveStanding: comparison.performanceScore > 75 ? 'Strong' :
                    comparison.performanceScore > 50 ? 'Competitive' : 'Developing'
            },
            nextSteps: comparison.recommendations.slice(0, 5), // Top 5 recommendations
            appendix: {
                methodology: 'V2 Industry Benchmarking System',
                dataSource: 'Authenticated industry databases',
                confidenceLevel: comparison.meta?.confidenceLevel || 0.85,
                processingTime: comparison.processingTime
            }
        };
        res.json({
            success: true,
            data: report,
            meta: {
                reportGenerated: new Date().toISOString(),
                reportType: 'Industry Benchmark Comparison',
                version: '2.0'
            }
        });
    }
    catch (error) {
        console.error('❌ Error generating benchmark report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate benchmark report'
        });
    }
});
export default router;
