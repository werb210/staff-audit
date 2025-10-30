/**
 * Security Monitoring and Incident Logging
 * Tracks security events and potential threats
 */
import { db } from '../db';
import { sql } from 'drizzle-orm';
/**
 * Log security events to database and console
 */
export async function logSecurityEvent(event) {
    try {
        // Log to console immediately
        const logLevel = event.severity === 'critical' || event.severity === 'high' ? '🚨' : '⚠️';
        console.log(`${logLevel} [SECURITY-${event.type.toUpperCase()}] ${event.details} | IP: ${event.ip} | Endpoint: ${event.endpoint}`);
        // Store in database for analysis (use raw SQL if security_events table doesn't exist)
        await db.execute(sql `
      INSERT INTO security_logs (event_type, severity, ip_address, user_agent, endpoint, details, createdAt)
      VALUES (${event.type}, ${event.severity}, ${event.ip}, ${event.userAgent || null}, ${event.endpoint}, ${event.details}, NOW())
      ON CONFLICT DO NOTHING
    `).catch(() => {
            // If table doesn't exist, just log to console
            console.log(`📋 [SECURITY-LOG] ${JSON.stringify(event)}`);
        });
    }
    catch (error) {
        console.error('Failed to log security event:', error);
    }
}
/**
 * Detect potential SQL injection attempts
 */
export function detectSQLInjection(input) {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
        /(\b(OR|AND)\s+[\w\s]*=\s*[\w\s]*)/i,
        /(;|\-\-|\/\*|\*\/)/,
        /(\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b)/i,
        /(0x[0-9a-f]+)/i,
        /(\b(CAST|CONVERT|ASCII|CHAR)\s*\()/i
    ];
    return sqlPatterns.some(pattern => pattern.test(input));
}
/**
 * Detect potential XSS attempts
 */
export function detectXSS(input) {
    const xssPatterns = [
        /<script[^>]*>.*?<\/script>/i,
        /<iframe[^>]*>.*?<\/iframe>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<img[^>]*onerror/i,
        /<svg[^>]*onload/i,
        /eval\s*\(/i,
        /document\.(cookie|location|write)/i
    ];
    return xssPatterns.some(pattern => pattern.test(input));
}
/**
 * Monitor request patterns for anomalies
 */
export async function checkRequestAnomalies(ip, endpoint) {
    try {
        // Check recent request frequency from this IP
        const recentRequests = await db.execute(sql `
      SELECT COUNT(*) as count 
      FROM request_logs 
      WHERE ip_address = ${ip} 
      AND endpoint = ${endpoint}
      AND createdAt > NOW() - INTERVAL '1 minute'
    `).catch(() => ({ rows: [{ count: 0 }] }));
        const requestCount = Number(recentRequests.rows[0]?.count || 0);
        // Flag if more than 60 requests per minute from same IP to same endpoint
        if (requestCount > 60) {
            await logSecurityEvent({
                type: 'rate_limit',
                severity: 'high',
                ip,
                endpoint,
                details: `Suspicious request pattern: ${requestCount} requests in 1 minute`,
                timestamp: new Date()
            });
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Error checking request anomalies:', error);
        return false;
    }
}
/**
 * Express middleware for security monitoring
 */
export function securityMonitoringMiddleware() {
    return async (req, res, next) => {
        try {
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            const endpoint = req.path;
            // Check for suspicious request patterns
            await checkRequestAnomalies(ip, endpoint);
            // Monitor request body for malicious content
            if (req.body) {
                const bodyStr = JSON.stringify(req.body);
                if (detectSQLInjection(bodyStr)) {
                    await logSecurityEvent({
                        type: 'sql_injection_attempt',
                        severity: 'critical',
                        ip,
                        userAgent,
                        endpoint,
                        details: `Potential SQL injection in request body`,
                        timestamp: new Date()
                    });
                }
                if (detectXSS(bodyStr)) {
                    await logSecurityEvent({
                        type: 'xss_attempt',
                        severity: 'high',
                        ip,
                        userAgent,
                        endpoint,
                        details: `Potential XSS attempt in request body`,
                        timestamp: new Date()
                    });
                }
            }
            // Log the request
            await db.execute(sql `
        INSERT INTO request_logs (ip_address, user_agent, endpoint, method, createdAt)
        VALUES (${ip}, ${userAgent}, ${endpoint}, ${req.method}, NOW())
        ON CONFLICT DO NOTHING
      `).catch(() => {
                // Silently continue if logging fails
            });
        }
        catch (error) {
            console.error('Security monitoring error:', error);
        }
        next();
    };
}
