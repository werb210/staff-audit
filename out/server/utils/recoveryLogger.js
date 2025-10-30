import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '../db';
export class RecoveryLogger {
    logFile;
    constructor() {
        this.logFile = path.join(process.cwd(), 'logs', 'document_recovery.log');
        this.ensureLogDirectory();
    }
    async ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        try {
            await fs.mkdir(logDir, { recursive: true });
        }
        catch (error) {
            console.error('❌ Failed to create recovery log directory:', error);
        }
    }
    /**
     * AUTO-RECOVERY 2: Log recovery event with status
     */
    async logRecoveryEvent(entry) {
        try {
            const logLine = this.formatLogEntry(entry);
            await fs.appendFile(this.logFile, logLine + '\n');
            await this.logToDatabase(entry);
            // Console logging with recovery status
            console.log(`📝 [AUTO-RECOVERY 2] LOGGED: ${entry.status}`);
            console.log(`   └─ Document: ${entry.fileName} (${entry.documentId})`);
            console.log(`   └─ Application: ${entry.businessName}`);
            console.log(`   └─ Status: ${entry.status}`);
            console.log(`   └─ Timestamp: ${entry.timestamp}`);
            if (entry.status === 'RECOVERED') {
                console.log(`🎉 [AUTO-RECOVERY 2] ✅ RECOVERY SUCCESS: ${entry.fileName}`);
                console.log(`   └─ Original: ${entry.originalPath}`);
                console.log(`   └─ New Path: ${entry.newPath}`);
                console.log(`   └─ File Size: ${entry.fileSize} bytes`);
            }
        }
        catch (error) {
            console.error('❌ [AUTO-RECOVERY 2] Failed to log recovery event:', error);
        }
    }
    /**
     * AUTO-RECOVERY 2: Log missing document detection
     */
    /**
     * Log successful file recovery
     */
    /**
     * Log to database
     */
    async logToDatabase(entry) {
        try {
            await pool.query(`
        INSERT INTO recovery_logs (
          document_id, name, applicationId, legal_business_name, 
          event_type, status, original_path, new_path, size, 
          uploaded_by, error_message, createdAt
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
                entry.documentId,
                entry.fileName,
                entry.applicationId,
                entry.businessName,
                'AUTO_RECOVERY',
                entry.status,
                entry.originalPath,
                entry.newPath || null,
                entry.fileSize || null,
                entry.uploadedBy || 'system',
                entry.details || null,
                entry.timestamp
            ]);
        }
        catch (error) {
            console.error('❌ Failed to log to database:', error);
        }
    }
    /**
     * Get file extension utility
     */
    getFileExtension(fileName) {
        const parts = fileName.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : 'pdf';
    }
    async logMissingDetected(documentId, fileName, applicationId, businessName, expectedPath) {
        const entry = {
            timestamp: new Date().toISOString(),
            documentId,
            fileName,
            applicationId,
            businessName,
            status: 'MISSING_DETECTED',
            originalPath: expectedPath,
            details: 'Document file not found on disk - recovery required'
        };
        await this.logRecoveryEvent(entry);
    }
    /**
     * AUTO-RECOVERY 2: Log recovery initiation
     */
    async logRecoveryInitiated(documentId, fileName, applicationId, businessName) {
        const entry = {
            timestamp: new Date().toISOString(),
            documentId,
            fileName,
            applicationId,
            businessName,
            status: 'RECOVERY_INITIATED',
            originalPath: 'N/A',
            details: 'User initiated document re-upload process'
        };
        await this.logRecoveryEvent(entry);
    }
    /**
     * AUTO-RECOVERY 2: Log successful recovery
     */
    async logRecoverySuccess(documentId, fileName, applicationId, businessName, originalPath, newPath, fileSize, uploadedBy = 'staff') {
        const entry = {
            timestamp: new Date().toISOString(),
            documentId,
            fileName,
            applicationId,
            businessName,
            status: 'RECOVERED',
            originalPath,
            newPath,
            fileSize,
            uploadedBy,
            details: 'Document successfully recovered via re-upload'
        };
        await this.logRecoveryEvent(entry);
    }
    /**
     * AUTO-RECOVERY 2: Log recovery failure
     */
    async logRecoveryFailure(documentId, fileName, applicationId, businessName, error) {
        const entry = {
            timestamp: new Date().toISOString(),
            documentId,
            fileName,
            applicationId,
            businessName,
            status: 'RECOVERY_FAILED',
            originalPath: 'N/A',
            details: `Recovery failed: ${error}`
        };
        await this.logRecoveryEvent(entry);
    }
    /**
     * Format log entry for file output
     */
    formatLogEntry(entry) {
        return JSON.stringify({
            timestamp: entry.timestamp,
            status: entry.status,
            documentId: entry.documentId,
            fileName: entry.fileName,
            applicationId: entry.applicationId,
            businessName: entry.businessName,
            originalPath: entry.originalPath,
            newPath: entry.newPath,
            fileSize: entry.fileSize,
            uploadedBy: entry.uploadedBy,
            details: entry.details
        });
    }
    /**
     * AUTO-RECOVERY 2: Get recovery statistics
     */
    async getRecoveryStats() {
        try {
            const logContent = await fs.readFile(this.logFile, 'utf-8');
            const lines = logContent.trim().split('\n').filter(line => line.length > 0);
            const events = lines.map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            }).filter(event => event !== null);
            const stats = {
                totalEvents: events.length,
                missingDetected: events.filter(e => e.status === 'MISSING_DETECTED').length,
                recoveryInitiated: events.filter(e => e.status === 'RECOVERY_INITIATED').length,
                successfulRecoveries: events.filter(e => e.status === 'RECOVERED').length,
                failedRecoveries: events.filter(e => e.status === 'RECOVERY_FAILED').length,
                recentEvents: events.slice(-10) // Last 10 events
            };
            console.log(`📊 [AUTO-RECOVERY 2] Recovery Statistics:`);
            console.log(`   └─ Total Events: ${stats.totalEvents}`);
            console.log(`   └─ Missing Detected: ${stats.missingDetected}`);
            console.log(`   └─ Recovery Initiated: ${stats.recoveryInitiated}`);
            console.log(`   └─ Successful Recoveries: ${stats.successfulRecoveries}`);
            console.log(`   └─ Failed Recoveries: ${stats.failedRecoveries}`);
            return stats;
        }
        catch (error) {
            console.error('❌ [AUTO-RECOVERY 2] Failed to get recovery stats:', error);
            return {
                totalEvents: 0,
                missingDetected: 0,
                recoveryInitiated: 0,
                successfulRecoveries: 0,
                failedRecoveries: 0,
                recentEvents: []
            };
        }
    }
}
// Global recovery logger instance
export const recoveryLogger = new RecoveryLogger();
