import { bankingAnalyzerService } from './bankingAnalyzer';
export class BankBalanceTrendsService {
    // Main function to extract monthly balance extremes
    async extractMonthlyExtremes(documentId) {
        try {
            console.log(`[BALANCE-TRENDS] Extracting balance trends for document ${documentId}`);
            // Get banking analysis data (which includes transaction parsing)
            const bankingAnalysis = await bankingAnalyzerService.analyzeBankingStatement(documentId);
            if (!bankingAnalysis.monthlyStats || bankingAnalysis.monthlyStats.length === 0) {
                return this.generateEmptyAnalysis(documentId);
            }
            // Extract monthly extremes from banking stats
            const monthlyExtremes = this.processMonthlyStats(bankingAnalysis.monthlyStats);
            // Calculate overall trends
            const overallTrends = this.calculateOverallTrends(monthlyExtremes);
            // Generate risk indicators
            const riskIndicators = this.identifyRiskIndicators(monthlyExtremes, overallTrends);
            // Generate insights
            const insights = this.generateInsights(monthlyExtremes, overallTrends);
            const analysis = {
                documentId,
                documentName: bankingAnalysis.documentName,
                analysisRange: {
                    startDate: this.getEarliestDate(monthlyExtremes),
                    endDate: this.getLatestDate(monthlyExtremes),
                    totalMonths: monthlyExtremes.length
                },
                monthlyExtremes,
                overallTrends,
                riskIndicators,
                insights,
                analyzedAt: new Date()
            };
            console.log(`[BALANCE-TRENDS] Analyzed ${monthlyExtremes.length} months of data`);
            return analysis;
        }
        catch (error) {
            console.error('[BALANCE-TRENDS] Error extracting balance trends:', error);
            throw error;
        }
    }
    // Process monthly stats into balance extremes
    processMonthlyStats(monthlyStats) {
        return monthlyStats.map((monthStat, index) => {
            const balanceRange = monthStat.maxBalance - monthStat.minBalance;
            // Calculate volatility (simplified - using range as proxy)
            const volatility = balanceRange / Math.max(monthStat.averageBalance, 1);
            // Determine monthly trend
            let monthlyTrend = 'stable';
            if (index > 0) {
                const prevMonth = monthlyStats[index - 1];
                const change = monthStat.averageBalance - prevMonth.averageBalance;
                const changePercent = change / Math.max(prevMonth.averageBalance, 1);
                if (changePercent > 0.1)
                    monthlyTrend = 'up';
                else if (changePercent < -0.1)
                    monthlyTrend = 'down';
            }
            // Count special days
            const daysOverdraft = monthStat.overdraftDays || 0;
            const daysAbove10k = monthStat.averageBalance > 10000 ? 30 : 0; // Simplified
            return {
                month: monthStat.month,
                year: monthStat.year,
                maxBalance: monthStat.maxBalance,
                minBalance: monthStat.minBalance,
                averageBalance: monthStat.averageBalance,
                balanceRange,
                volatility: Math.round(volatility * 100) / 100,
                daysOverdraft,
                daysAbove10k,
                monthlyTrend
            };
        });
    }
    // Calculate overall trends across all months
    calculateOverallTrends(monthlyExtremes) {
        if (monthlyExtremes.length === 0) {
            return {
                overallTrend: 'stable',
                averageVolatility: 0,
                highestBalance: 0,
                lowestBalance: 0,
                monthsWithOverdraft: 0,
                averageMonthlyRange: 0
            };
        }
        // Calculate overall trend
        let overallTrend = 'stable';
        if (monthlyExtremes.length >= 3) {
            const firstThird = monthlyExtremes.slice(0, Math.floor(monthlyExtremes.length / 3));
            const lastThird = monthlyExtremes.slice(-Math.floor(monthlyExtremes.length / 3));
            const firstAvg = firstThird.reduce((sum, m) => sum + m.averageBalance, 0) / firstThird.length;
            const lastAvg = lastThird.reduce((sum, m) => sum + m.averageBalance, 0) / lastThird.length;
            const change = (lastAvg - firstAvg) / firstAvg;
            if (change > 0.15)
                overallTrend = 'improving';
            else if (change < -0.15)
                overallTrend = 'declining';
        }
        // Calculate metrics
        const averageVolatility = monthlyExtremes.reduce((sum, m) => sum + m.volatility, 0) / monthlyExtremes.length;
        const highestBalance = Math.max(...monthlyExtremes.map(m => m.maxBalance));
        const lowestBalance = Math.min(...monthlyExtremes.map(m => m.minBalance));
        const monthsWithOverdraft = monthlyExtremes.filter(m => m.daysOverdraft > 0).length;
        const averageMonthlyRange = monthlyExtremes.reduce((sum, m) => sum + m.balanceRange, 0) / monthlyExtremes.length;
        return {
            overallTrend,
            averageVolatility: Math.round(averageVolatility * 100) / 100,
            highestBalance,
            lowestBalance,
            monthsWithOverdraft,
            averageMonthlyRange: Math.round(averageMonthlyRange)
        };
    }
    // Identify risk indicators from balance patterns
    identifyRiskIndicators(monthlyExtremes, overallTrends) {
        const risks = [];
        // High volatility risk
        if (overallTrends.averageVolatility > 0.5) {
            risks.push('High balance volatility indicates unstable cash flow');
        }
        // Frequent overdrafts
        if (overallTrends.monthsWithOverdraft > monthlyExtremes.length * 0.3) {
            risks.push('Frequent overdrafts across multiple months');
        }
        // Declining trend
        if (overallTrends.overallTrend === 'declining') {
            risks.push('Declining balance trend over analysis period');
        }
        // Very low minimum balances
        if (overallTrends.lowestBalance < -5000) {
            risks.push('Significant negative balances recorded');
        }
        // Consistent low balances
        const lowBalanceMonths = monthlyExtremes.filter(m => m.averageBalance < 1000).length;
        if (lowBalanceMonths > monthlyExtremes.length * 0.4) {
            risks.push('Consistently low account balances');
        }
        // High month-to-month variance
        if (overallTrends.averageMonthlyRange > 20000) {
            risks.push('Large month-to-month balance swings');
        }
        return risks;
    }
    // Generate insights from balance analysis
    generateInsights(monthlyExtremes, overallTrends) {
        const insights = [];
        // Positive insights
        if (overallTrends.overallTrend === 'improving') {
            insights.push('Account balances show improvement over time');
        }
        if (overallTrends.monthsWithOverdraft === 0) {
            insights.push('No overdraft incidents throughout analysis period');
        }
        if (overallTrends.averageVolatility < 0.2) {
            insights.push('Stable balance patterns indicate consistent cash management');
        }
        // Performance insights
        const avgBalance = monthlyExtremes.reduce((sum, m) => sum + m.averageBalance, 0) / monthlyExtremes.length;
        if (avgBalance > 25000) {
            insights.push('Strong average balance supports lending capacity');
        }
        else if (avgBalance > 10000) {
            insights.push('Adequate average balance for business operations');
        }
        // Seasonal patterns
        const monthlyTrends = monthlyExtremes.map(m => m.monthlyTrend);
        const upMonths = monthlyTrends.filter(t => t === 'up').length;
        const downMonths = monthlyTrends.filter(t => t === 'down').length;
        if (upMonths > downMonths * 1.5) {
            insights.push('More months with balance growth than decline');
        }
        // Range insights
        if (overallTrends.averageMonthlyRange < 5000) {
            insights.push('Low balance volatility suggests predictable cash flow');
        }
        return insights;
    }
    // Helper functions
    getEarliestDate(monthlyExtremes) {
        if (monthlyExtremes.length === 0)
            return new Date().toISOString();
        const earliest = monthlyExtremes[0];
        return new Date(earliest.year, this.getMonthNumber(earliest.month), 1).toISOString();
    }
    getLatestDate(monthlyExtremes) {
        if (monthlyExtremes.length === 0)
            return new Date().toISOString();
        const latest = monthlyExtremes[monthlyExtremes.length - 1];
        return new Date(latest.year, this.getMonthNumber(latest.month), 28).toISOString();
    }
    getMonthNumber(monthName) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        return months.indexOf(monthName.toLowerCase().substring(0, 3));
    }
    // Generate empty analysis when no data available
    generateEmptyAnalysis(documentId) {
        return {
            documentId,
            documentName: 'Unknown Document',
            analysisRange: {
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
                totalMonths: 0
            },
            monthlyExtremes: [],
            overallTrends: {
                overallTrend: 'stable',
                averageVolatility: 0,
                highestBalance: 0,
                lowestBalance: 0,
                monthsWithOverdraft: 0,
                averageMonthlyRange: 0
            },
            riskIndicators: ['No banking data available for analysis'],
            insights: ['Banking statement analysis could not be performed'],
            analyzedAt: new Date()
        };
    }
    // Batch analyze multiple documents
    async batchAnalyzeBalanceTrends(documentIds) {
        const analyses = [];
        let totalMonthsAnalyzed = 0;
        let totalVolatility = 0;
        let documentsWithData = 0;
        for (const documentId of documentIds) {
            try {
                const analysis = await this.extractMonthlyExtremes(documentId);
                analyses.push(analysis);
                if (analysis.monthlyExtremes.length > 0) {
                    documentsWithData++;
                    totalMonthsAnalyzed += analysis.monthlyExtremes.length;
                    totalVolatility += analysis.overallTrends.averageVolatility;
                }
            }
            catch (error) {
                console.error(`[BALANCE-TRENDS] Error analyzing document ${documentId}:`, error);
            }
        }
        return {
            analyses,
            summary: {
                totalDocuments: documentIds.length,
                documentsWithData,
                totalMonthsAnalyzed,
                averageVolatility: documentsWithData > 0 ? totalVolatility / documentsWithData : 0
            }
        };
    }
}
export const bankBalanceTrendsService = new BankBalanceTrendsService();
