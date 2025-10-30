import { db } from '../db.js';
import { documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import { validateChecksum } from './documentValidation.js';
/**
 * Analyze document health and generate predictive flags
 */
export async function analyzeDocumentHealth(documentId) {
    console.log(`🏥 [HEALTH] Analyzing document health: ${documentId}`);
    try {
        // Get document record
        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId));
        if (!document) {
            throw new Error('Document not found');
        }
        const flags = {
            missing_file_on_disk: false,
            missing_object_storage_key: false,
            sha256_mismatch: false,
            no_preview_renderable: false
        };
        // Check 1: File exists on disk
        if (!document.filePath || !fs.existsSync(document.filePath)) {
            flags.missing_file_on_disk = true;
            console.log(`🚨 [HEALTH] Missing file on disk: ${document.filePath}`);
        }
        // Check 2: Object storage key exists
        if (!document.storageKey || document.storageKey.trim() === '') {
            flags.missing_object_storage_key = true;
            console.log(`🚨 [HEALTH] Missing object storage key`);
        }
        // Check 3: SHA256 validation (only if file exists)
        if (!flags.missing_file_on_disk && document.sha256) {
            try {
                const validation = await validateChecksum(documentId);
                if (!validation.valid) {
                    flags.sha256_mismatch = true;
                    console.log(`🚨 [HEALTH] SHA256 mismatch detected`);
                }
            }
            catch (error) {
                console.log(`⚠️ [HEALTH] SHA256 validation failed: ${error}`);
                flags.sha256_mismatch = true;
            }
        }
        // Check 4: Preview renderable (based on file type and existence)
        const renderableTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
        if (!document.fileType || !renderableTypes.includes(document.fileType)) {
            if (flags.missing_file_on_disk && flags.missing_object_storage_key) {
                flags.no_preview_renderable = true;
                console.log(`🚨 [HEALTH] No preview renderable - file missing and unsupported type`);
            }
        }
        // Calculate health score
        const flagCount = Object.values(flags).filter(flag => flag).length;
        let healthScore;
        if (flagCount === 0) {
            healthScore = 'healthy';
        }
        else if (flagCount <= 2) {
            healthScore = 'warning';
        }
        else {
            healthScore = 'critical';
        }
        console.log(`📊 [HEALTH] Health score: ${healthScore} (${flagCount} flags)`);
        return {
            documentId,
            fileName: document.fileName,
            applicationId: document.applicationId,
            healthScore,
            flags,
            lastChecked: new Date(),
            fileSize: document.fileSize || undefined,
            fileType: document.fileType || undefined,
            created: document.createdAt
        };
    }
    catch (error) {
        console.error(`❌ [HEALTH] Error analyzing document health:`, error);
        // Return critical status for documents we can't analyze
        return {
            documentId,
            fileName: 'Unknown',
            applicationId: '',
            healthScore: 'critical',
            flags: {
                missing_file_on_disk: true,
                missing_object_storage_key: true,
                sha256_mismatch: true,
                no_preview_renderable: true
            },
            lastChecked: new Date(),
            created: new Date()
        };
    }
}
/**
 * Generate comprehensive health report for all documents
 */
export async function generateHealthReport() {
    console.log(`🏥 [HEALTH] Generating comprehensive health report...`);
    try {
        // Get all documents
        const allDocuments = await db.select().from(documents);
        console.log(`📋 [HEALTH] Analyzing ${allDocuments.length} documents...`);
        const healthStatuses = [];
        // Analyze each document
        for (const doc of allDocuments) {
            try {
                const health = await analyzeDocumentHealth(doc.id);
                healthStatuses.push(health);
            }
            catch (error) {
                console.error(`❌ [HEALTH] Failed to analyze ${doc.id}:`, error);
                // Add critical status for failed analyses
                healthStatuses.push({
                    documentId: doc.id,
                    fileName: doc.fileName,
                    applicationId: doc.applicationId,
                    healthScore: 'critical',
                    flags: {
                        missing_file_on_disk: true,
                        missing_object_storage_key: true,
                        sha256_mismatch: true,
                        no_preview_renderable: true
                    },
                    lastChecked: new Date(),
                    fileSize: doc.fileSize || undefined,
                    fileType: doc.fileType || undefined,
                    created: doc.createdAt
                });
            }
        }
        // Calculate overview statistics
        const healthy = healthStatuses.filter(h => h.healthScore === 'healthy').length;
        const warning = healthStatuses.filter(h => h.healthScore === 'warning').length;
        const critical = healthStatuses.filter(h => h.healthScore === 'critical').length;
        const total = healthStatuses.length;
        const healthyPercentage = total > 0 ? (healthy / total) * 100 : 0;
        // Generate recommendations
        const recommendations = [];
        if (critical > 0) {
            recommendations.push(`🚨 ${critical} documents require immediate attention (critical health)`);
        }
        if (warning > 0) {
            recommendations.push(`⚠️ ${warning} documents need monitoring (warning health)`);
        }
        const missingDisk = healthStatuses.filter(h => h.flags.missing_file_on_disk).length;
        if (missingDisk > 0) {
            recommendations.push(`💾 ${missingDisk} documents missing from disk storage`);
        }
        const missingStorage = healthStatuses.filter(h => h.flags.missing_object_storage_key).length;
        if (missingStorage > 0) {
            recommendations.push(`☁️ ${missingStorage} documents need object storage backup`);
        }
        const checksumIssues = healthStatuses.filter(h => h.flags.sha256_mismatch).length;
        if (checksumIssues > 0) {
            recommendations.push(`🔐 ${checksumIssues} documents have checksum validation issues`);
        }
        if (healthyPercentage < 80) {
            recommendations.push(`📈 Document health is below 80% - consider running maintenance tasks`);
        }
        if (recommendations.length === 0) {
            recommendations.push(`✅ All documents are healthy - no immediate action required`);
        }
        console.log(`📊 [HEALTH] Report complete: ${healthy} healthy, ${warning} warning, ${critical} critical`);
        return {
            overview: {
                total,
                healthy,
                warning,
                critical,
                healthyPercentage: Math.round(healthyPercentage * 100) / 100
            },
            documents: healthStatuses.sort((a, b) => {
                // Sort by health score (critical first), then by file name
                const scoreOrder = { critical: 3, warning: 2, healthy: 1 };
                if (scoreOrder[a.healthScore] !== scoreOrder[b.healthScore]) {
                    return scoreOrder[b.healthScore] - scoreOrder[a.healthScore];
                }
                return a.fileName.localeCompare(b.fileName);
            }),
            recommendations
        };
    }
    catch (error) {
        console.error(`❌ [HEALTH] Error generating health report:`, error);
        return {
            overview: { total: 0, healthy: 0, warning: 0, critical: 0, healthyPercentage: 0 },
            documents: [],
            recommendations: ['❌ Failed to generate health report - check system logs']
        };
    }
}
/**
 * Get health report for specific application
 */
export async function getApplicationHealthReport(applicationId) {
    console.log(`🏥 [HEALTH] Generating health report for application: ${applicationId}`);
    try {
        // Get documents for this application
        const appDocuments = await db
            .select()
            .from(documents)
            .where(eq(documents.applicationId, applicationId));
        console.log(`📋 [HEALTH] Found ${appDocuments.length} documents for application`);
        const healthStatuses = [];
        // Analyze each document
        for (const doc of appDocuments) {
            const health = await analyzeDocumentHealth(doc.id);
            healthStatuses.push(health);
        }
        // Calculate overview
        const healthy = healthStatuses.filter(h => h.healthScore === 'healthy').length;
        const warning = healthStatuses.filter(h => h.healthScore === 'warning').length;
        const critical = healthStatuses.filter(h => h.healthScore === 'critical').length;
        return {
            applicationId,
            overview: {
                total: healthStatuses.length,
                healthy,
                warning,
                critical
            },
            documents: healthStatuses.sort((a, b) => a.fileName.localeCompare(b.fileName))
        };
    }
    catch (error) {
        console.error(`❌ [HEALTH] Error generating application health report:`, error);
        return {
            applicationId,
            overview: { total: 0, healthy: 0, warning: 0, critical: 0 },
            documents: []
        };
    }
}
/**
 * Export health report to CSV format
 */
export function exportHealthReportToCSV(documents) {
    console.log(`📊 [HEALTH] Exporting health report to CSV format...`);
    const headers = [
        'Document ID',
        'File Name',
        'Application ID',
        'Health Score',
        'Missing File on Disk',
        'Missing Object Storage',
        'SHA256 Mismatch',
        'No Preview Renderable',
        'File Size',
        'File Type',
        'Last Checked',
        'Created'
    ];
    const rows = documents.map(doc => [
        doc.documentId,
        doc.fileName,
        doc.applicationId,
        doc.healthScore,
        doc.flags.missing_file_on_disk ? 'YES' : 'NO',
        doc.flags.missing_object_storage_key ? 'YES' : 'NO',
        doc.flags.sha256_mismatch ? 'YES' : 'NO',
        doc.flags.no_preview_renderable ? 'YES' : 'NO',
        doc.fileSize?.toString() || '',
        doc.fileType || '',
        doc.lastChecked.toISOString(),
        doc.created.toISOString()
    ]);
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    console.log(`✅ [HEALTH] CSV export complete: ${rows.length} rows`);
    return csvContent;
}
/**
 * Get recovery event history for dashboard
 */
export async function getRecoveryEventHistory(limit = 50) {
    console.log('Recovery event history temporarily disabled during schema migration');
    // Return empty array during schema migration
    return [];
}
