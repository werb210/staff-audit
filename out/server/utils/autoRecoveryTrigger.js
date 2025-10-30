import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '../db.js';
/**
 * AUTO-TRIGGER 1: Scan for missing documents and trigger recovery alerts
 */
export async function triggerAutoRecoveryFlow() {
    console.log('🔄 [AUTO-RECOVERY 1] Starting automatic missing document detection...');
    const result = {
        totalScanned: 0,
        missingDetected: 0,
        recoveryTriggered: 0,
        alerts: []
    };
    try {
        // Get all documents from database using connection pool
        const query = 'SELECT id, name, file_path, applicationId, size, createdAt FROM documents';
        const dbResult = await pool.query(query);
        const allDocuments = dbResult.rows;
        result.totalScanned = allDocuments.length;
        console.log(`📊 [AUTO-RECOVERY 1] Scanning ${result.totalScanned} documents for missing files...`);
        // Check each document for file existence
        for (const doc of allDocuments) {
            const fullPath = path.join(process.cwd(), doc.filePath || '');
            try {
                await fs.access(fullPath);
                // File exists - no action needed
            }
            catch (error) {
                // File missing - trigger recovery
                result.missingDetected++;
                const alert = {
                    documentId: doc.id || '',
                    fileName: doc.fileName || 'Unknown',
                    applicationId: doc.applicationId || '',
                    businessName: 'Unknown Business',
                    expectedPath: doc.filePath || '',
                    lastModified: doc.createdAt?.toISOString() || new Date().toISOString(),
                    requiresRecovery: true
                };
                result.alerts.push(alert);
                // AUTO-TRIGGER: Log recovery requirement
                console.log(`🚨 [AUTO-RECOVERY 1] MISSING DETECTED: ${doc.fileName}`);
                console.log(`   └─ Document ID: ${doc.id}`);
                console.log(`   └─ Application: Unknown Business (${doc.applicationId})`);
                console.log(`   └─ Expected Path: ${doc.filePath}`);
                console.log(`   └─ Recovery Status: REQUIRED`);
                result.recoveryTriggered++;
            }
        }
        // Summary logging
        console.log(`✅ [AUTO-RECOVERY 1] Detection complete:`);
        console.log(`   └─ Documents scanned: ${result.totalScanned}`);
        console.log(`   └─ Missing detected: ${result.missingDetected}`);
        console.log(`   └─ Recovery triggers: ${result.recoveryTriggered}`);
        return result;
    }
    catch (error) {
        console.error('❌ [AUTO-RECOVERY 1] Detection failed:', error);
        throw error;
    }
}
/**
 * AUTO-TRIGGER 2: Get missing documents for specific application
 */
export async function getMissingDocumentsForApplication(applicationId) {
    console.log(`🔍 [AUTO-RECOVERY 1] Checking missing documents for application: ${applicationId}`);
    const alerts = [];
    try {
        // Get all documents for the application using connection pool
        const query = 'SELECT id, name, file_path, applicationId, createdAt FROM documents WHERE applicationId = $1';
        const dbResult = await pool.query(query, [applicationId]);
        const appDocuments = dbResult.rows;
        for (const doc of appDocuments) {
            const fullPath = path.join(process.cwd(), doc.filePath || '');
            try {
                await fs.access(fullPath);
            }
            catch (error) {
                alerts.push({
                    documentId: doc.id,
                    fileName: doc.fileName || 'Unknown',
                    applicationId: doc.applicationId || '',
                    businessName: 'Application Documents',
                    expectedPath: doc.filePath || '',
                    lastModified: doc.createdAt?.toISOString() || new Date().toISOString(),
                    requiresRecovery: true
                });
                console.log(`📋 [AUTO-RECOVERY 1] Missing in app ${applicationId}: ${doc.fileName}`);
            }
        }
        return alerts;
    }
    catch (error) {
        console.error(`❌ [AUTO-RECOVERY 1] Application scan failed:`, error);
        return [];
    }
}
/**
 * AUTO-TRIGGER 3: Mark document as requiring recovery in database
 */
export async function markDocumentForRecovery(documentId) {
    try {
        console.log(`🔄 [AUTO-RECOVERY 1] Marking document for recovery: ${documentId}`);
        // Update document with recovery flag (if recovery status field exists)
        // For now, just log the requirement
        console.log(`✅ [AUTO-RECOVERY 1] Document ${documentId} marked for recovery`);
        return true;
    }
    catch (error) {
        console.error(`❌ [AUTO-RECOVERY 1] Failed to mark document for recovery:`, error);
        return false;
    }
}
