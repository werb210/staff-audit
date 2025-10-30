/**
 * SECURITY HISTORY AND LOGGING API
 * Tracks security test results and provides audit trail for compliance
 */
import { Router } from 'express';
const router = Router();
// In-memory storage for development (replace with database in production)
const securityTestHistory = [];
// Log security test results
router.post('/security/log', async (req, res) => {
    try {
        const { results, environment = 'dev' } = req.body;
        if (!results) {
            return res.status(400).json({
                success: false,
                error: 'Security test results required'
            });
        }
        const logEntry = {
            id: `security_test_${Date.now()}`,
            timestamp: new Date().toISOString(),
            environment,
            overallGrade: results.overallGrade || 'Unknown',
            totalTests: results.totalTests || 0,
            passedTests: results.passedTests || 0,
            criticalFailures: results.criticalFailures || 0,
            results: results.results || [],
            userAgent: req.get('User-Agent'),
            sourceIp: req.ip || req.connection.remoteAddress
        };
        // Store in memory (in production, store in database)
        securityTestHistory.push(logEntry);
        // Keep only last 50 entries
        if (securityTestHistory.length > 50) {
            securityTestHistory.shift();
        }
        res.json({
            success: true,
            logId: logEntry.id,
            message: 'Security test results logged successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// Get security test history
router.get('/security/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const environment = req.query.environment;
        let filteredHistory = securityTestHistory;
        if (environment) {
            filteredHistory = securityTestHistory.filter(entry => entry.environment === environment);
        }
        // Sort by timestamp descending and limit results
        const recentHistory = filteredHistory
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
        res.json({
            success: true,
            history: recentHistory,
            total: filteredHistory.length
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// Get security dashboard summary
router.get('/security/dashboard', async (req, res) => {
    try {
        if (securityTestHistory.length === 0) {
            return res.json({
                success: true,
                summary: {
                    lastTestRun: null,
                    overallTrend: 'No data',
                    criticalIssues: 0,
                    averageGrade: 'N/A',
                    totalTestsRun: 0
                }
            });
        }
        const recentTests = securityTestHistory
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);
        const lastTest = recentTests[0];
        const criticalIssues = recentTests.filter(test => test.criticalFailures > 0).length;
        // Calculate average grade (simplified)
        const gradeValues = { 'A+': 100, 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'F': 50 };
        const averageGradeValue = recentTests.reduce((sum, test) => {
            return sum + (gradeValues[test.overallGrade] || 50);
        }, 0) / recentTests.length;
        const averageGrade = Object.entries(gradeValues).find(([grade, value]) => averageGradeValue >= value)?.[0] || 'F';
        // Determine trend
        let trend = 'Stable';
        if (recentTests.length >= 2) {
            const latest = gradeValues[recentTests[0].overallGrade] || 50;
            const previous = gradeValues[recentTests[1].overallGrade] || 50;
            if (latest > previous)
                trend = 'Improving';
            else if (latest < previous)
                trend = 'Declining';
        }
        res.json({
            success: true,
            summary: {
                lastTestRun: lastTest.timestamp,
                lastTestGrade: lastTest.overallGrade,
                overallTrend: trend,
                criticalIssues,
                averageGrade,
                totalTestsRun: securityTestHistory.length,
                recentFailures: recentTests.filter(test => test.criticalFailures > 0).length
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// Get specific security test details
router.get('/security/test/:testId', async (req, res) => {
    try {
        const testId = req.params.testId;
        const testLog = securityTestHistory.find(log => log.id === testId);
        if (!testLog) {
            return res.status(404).json({
                success: false,
                error: 'Security test not found'
            });
        }
        res.json({
            success: true,
            testLog
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
