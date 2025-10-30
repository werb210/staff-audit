/**
 * PERMANENT UPLOAD SYSTEM MONITORING - SAFE LOGGING ONLY
 *
 * This module provides safe monitoring capabilities for the hardened upload system.
 * NO CLEANUP LOGIC - LOGGING AND ALERTING ONLY
 *
 * Created: July 19, 2025
 * Purpose: Permanent hardening implementation
 */
import { db } from '../db.js';
import { sql } from 'drizzle-orm';
/**
 * PERMANENT MONITORING QUERY - Detect applications with zero documents
 * This is safe query-only monitoring with no destructive operations
 */
export async function findZeroDocumentApplications(hours = 24) {
    try {
        console.log(`🔍 [MONITORING] Checking for applications with zero documents in last ${hours} hours`);
        const result = await db.execute(sql `
      SELECT a.id as applicationId, 
             a.legal_business_name,
             a.contact_email,
             a.createdAt,
             COUNT(d.id) as document_count
      FROM applications a
      LEFT JOIN documents d ON d.applicationId = a.id
      WHERE a.createdAt > NOW() - INTERVAL '${sql.raw(hours.toString())} hours'
      GROUP BY a.id, a.legal_business_name, a.email, a.createdAt
      HAVING COUNT(d.id) = 0
      ORDER BY a.createdAt DESC
    `);
        const zeroDocApps = result.rows || [];
        if (zeroDocApps.length > 0) {
            console.log(`⚠️ [MONITORING] Found ${zeroDocApps.length} applications with zero documents:`);
            zeroDocApps.forEach((app) => {
                console.log(`   - ${app.applicationId}: ${app.businessName} (${app.email})`);
            });
        }
        else {
            console.log(`✅ [MONITORING] All applications have documents - upload system healthy`);
        }
        return zeroDocApps;
    }
    catch (error) {
        console.error(`❌ [MONITORING] Error checking zero-document applications:`, error);
        return [];
    }
}
/**
 * SAFE UPLOAD HEALTH CHECK - Query only, no mutations
 */
export async function checkUploadSystemHealth() {
    try {
        // Get total counts
        const appCountResult = await db.execute(sql `SELECT COUNT(*) as count FROM applications`);
        const docCountResult = await db.execute(sql `SELECT COUNT(*) as count FROM documents`);
        const totalApplications = parseInt(appCountResult.rows[0]?.count) || 0;
        const totalDocuments = parseInt(docCountResult.rows[0]?.count) || 0;
        const averageDocsPerApp = totalApplications > 0 ? totalDocuments / totalApplications : 0;
        // Check for problematic applications
        const zeroDocApps = await findZeroDocumentApplications(24);
        const zeroDocumentApps = zeroDocApps.length;
        // Determine system health
        let status = 'healthy';
        if (zeroDocumentApps > 5) {
            status = 'critical';
        }
        else if (zeroDocumentApps > 0 || averageDocsPerApp < 1) {
            status = 'warning';
        }
        const healthReport = {
            totalApplications,
            totalDocuments,
            averageDocsPerApp: Math.round(averageDocsPerApp * 100) / 100,
            zeroDocumentApps,
            status
        };
        console.log(`📊 [MONITORING] Upload system health check:`, healthReport);
        return healthReport;
    }
    catch (error) {
        console.error(`❌ [MONITORING] Health check failed:`, error);
        return {
            totalApplications: 0,
            totalDocuments: 0,
            averageDocsPerApp: 0,
            zeroDocumentApps: 0,
            status: 'critical'
        };
    }
}
/**
 * ADMIN ALERT THRESHOLD CHECK - Safe monitoring only
 */
export async function checkAdminAlertThresholds() {
    try {
        const health = await checkUploadSystemHealth();
        const reasons = [];
        // Define alert thresholds
        if (health.zeroDocumentApps > 3) {
            reasons.push(`${health.zeroDocumentApps} applications have zero documents`);
        }
        if (health.averageDocsPerApp < 0.5) {
            reasons.push(`Low document ratio: ${health.averageDocsPerApp} docs per application`);
        }
        if (health.status === 'critical') {
            reasons.push('System status is critical');
        }
        const shouldAlert = reasons.length > 0;
        if (shouldAlert) {
            console.log(`🚨 [ADMIN ALERT] Upload system requires attention:`, reasons);
        }
        return {
            shouldAlert,
            reasons,
            metrics: health
        };
    }
    catch (error) {
        console.error(`❌ [ADMIN ALERT] Alert check failed:`, error);
        return {
            shouldAlert: true,
            reasons: ['Alert system failure'],
            metrics: null
        };
    }
}
/**
 * SAFE LOGGING ONLY - Connection event tracking (no cleanup)
 * This replaces all dangerous connection monitoring with safe logging
 */
export function logConnectionEvent(eventType, applicationId, details) {
    // 🚫 NO CLEANUP LOGIC - LOGGING ONLY
    const timestamp = new Date().toISOString();
    console.log(`🟡 [CONNECTION LOG] ${timestamp} - ${eventType} for application ${applicationId}`, details || '');
    // Note: This is pure logging - no file cleanup, no database cleanup, no abort handling
    // Any future cleanup logic must be approved via ChatGPT review
}
// 🚫 DO NOT ADD ABORT-BASED CLEANUP HERE
// This monitoring system has been hardened against false positives.
// Any future connection monitoring must be approved via ChatGPT review.
