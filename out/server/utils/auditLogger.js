class AuditLogger {
    logs = [];
    async logAction(entry) {
        // Add timestamp if not provided
        entry.timestamp = entry.timestamp || new Date();
        // Store in memory for immediate access
        this.logs.push(entry);
        // Log to console with structured format
        console.log(`📝 [AUDIT] ${entry.action.toUpperCase()}: Document ${entry.documentId}`);
        console.log(`   - Time: ${entry.timestamp.toISOString()}`);
        console.log(`   - Details: ${JSON.stringify(entry.details)}`);
        // Keep only last 1000 entries in memory
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }
    }
    async logUpload(documentId, fileName, fileSize, checksum) {
        await this.logAction({
            documentId,
            action: 'upload',
            details: {
                fileName,
                fileSize,
                checksum: checksum || 'not_computed',
                hasChecksum: !!checksum
            }
        });
    }
    async logReupload(documentId, oldFileName, newFileName, reason) {
        await this.logAction({
            documentId,
            action: 'reupload',
            details: {
                oldFileName,
                newFileName,
                reason
            }
        });
    }
    async logChecksumMismatch(documentId, expectedChecksum, actualChecksum) {
        await this.logAction({
            documentId,
            action: 'checksum_mismatch',
            details: {
                expectedChecksum,
                actualChecksum,
                severity: 'HIGH'
            }
        });
    }
    async logCategoryChange(documentId, oldCategory, newCategory) {
        await this.logAction({
            documentId,
            action: 'category_change',
            details: {
                oldCategory,
                newCategory
            }
        });
    }
    async logFileMissing(documentId, filePath) {
        await this.logAction({
            documentId,
            action: 'file_missing',
            details: {
                filePath,
                severity: 'CRITICAL'
            }
        });
    }
    async logRecovery(documentId, recoveryMethod, success) {
        await this.logAction({
            documentId,
            action: 'recovery',
            details: {
                recoveryMethod,
                success,
                severity: success ? 'INFO' : 'ERROR'
            }
        });
    }
    getRecentLogs(limit = 100) {
        return this.logs.slice(-limit);
    }
    getLogsByDocument(documentId) {
        return this.logs.filter(log => log.documentId === documentId);
    }
    async generateAuditReport() {
        const recent = this.getRecentLogs(50);
        const summary = {
            totalActions: this.logs.length,
            recentActions: recent.length,
            actionsByType: this.logs.reduce((acc, log) => {
                acc[log.action] = (acc[log.action] || 0) + 1;
                return acc;
            }, {}),
            criticalEvents: this.logs.filter(log => log.details.severity === 'CRITICAL' ||
                log.action === 'checksum_mismatch' ||
                log.action === 'file_missing').length
        };
        return {
            summary,
            recentLogs: recent,
            generatedAt: new Date().toISOString()
        };
    }
}
// Export singleton instance
export const auditLogger = new AuditLogger();
