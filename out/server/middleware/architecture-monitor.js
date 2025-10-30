// Architecture Monitor - Continuous monitoring for architecture violations
class ArchitectureMonitor {
    violations = [];
    routeStats = new Map();
    logViolation(violation) {
        const fullViolation = {
            ...violation,
            timestamp: new Date()
        };
        this.violations.push(fullViolation);
        // Log immediately for critical violations
        if (violation.severity === 'critical') {
            console.error(`🚨 [ARCHITECTURE] CRITICAL: ${violation.message}`);
        }
        else if (violation.severity === 'error') {
            console.error(`❌ [ARCHITECTURE] ERROR: ${violation.message}`);
        }
        else {
            console.warn(`⚠️  [ARCHITECTURE] WARNING: ${violation.message}`);
        }
        // Keep only last 1000 violations to prevent memory leaks
        if (this.violations.length > 1000) {
            this.violations = this.violations.slice(-1000);
        }
    }
    trackRouteAccess(path) {
        const stats = this.routeStats.get(path) || { count: 0, lastAccess: new Date() };
        stats.count++;
        stats.lastAccess = new Date();
        this.routeStats.set(path, stats);
    }
    // Middleware to monitor route access patterns
    middleware() {
        return (req, res, next) => {
            const originalPath = req.route?.path || req.path;
            // Track route access
            this.trackRouteAccess(originalPath);
            // Check for suspicious patterns
            if (req.path.includes('//')) {
                this.logViolation({
                    type: 'dangerous_pattern',
                    severity: 'warning',
                    message: `Double slash in path: ${req.path}`,
                    context: { url: req.url, method: req.method }
                });
            }
            // Check for very long query strings (potential attack)
            if (req.url.length > 2000) {
                this.logViolation({
                    type: 'dangerous_pattern',
                    severity: 'warning',
                    message: `Unusually long URL: ${req.url.length} characters`,
                    context: { method: req.method }
                });
            }
            next();
        };
    }
    // Get current architecture health report
    getHealthReport() {
        const now = new Date();
        const recentViolations = this.violations.filter(v => now.getTime() - v.timestamp.getTime() < 60000 // Last minute
        );
        const criticalCount = recentViolations.filter(v => v.severity === 'critical').length;
        const errorCount = recentViolations.filter(v => v.severity === 'error').length;
        const warningCount = recentViolations.filter(v => v.severity === 'warning').length;
        return {
            status: criticalCount > 0 ? 'critical' : errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'healthy',
            violations: {
                critical: criticalCount,
                error: errorCount,
                warning: warningCount,
                total: recentViolations.length
            },
            routes: {
                tracked: this.routeStats.size,
                totalRequests: Array.from(this.routeStats.values()).reduce((sum, stat) => sum + stat.count, 0)
            },
            timestamp: now
        };
    }
    // Get detailed violation report
    getViolationReport(limit = 50) {
        return {
            violations: this.violations.slice(-limit),
            summary: this.getHealthReport()
        };
    }
    // Clear old violations (cleanup)
    cleanup(olderThanMs = 24 * 60 * 60 * 1000) {
        const cutoff = new Date(Date.now() - olderThanMs);
        this.violations = this.violations.filter(v => v.timestamp > cutoff);
    }
}
// Global instance
export const architectureMonitor = new ArchitectureMonitor();
// Express middleware export
export default architectureMonitor.middleware();
